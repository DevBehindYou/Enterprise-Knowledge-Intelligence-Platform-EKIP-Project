import Conversation from '../models/Conversation.js';
import { answerQuestion } from '../services/rag/generationService.js';
import { evaluationService } from '../services/rag/evaluationService.js';
import { writeAudit } from '../middleware/auditWrite.js';

export const chatController = {
  async ask(req, res, next) {
    try {
      const { conversationId, question } = req.body;
      if (!question?.trim()) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'question is required.' } });
      }

      let conversation = conversationId
        ? await Conversation.findOne({ _id: conversationId, userId: req.user.id, tenantId: req.user.tenantId })
        : null;
      if (!conversation) {
        conversation = await Conversation.create({
          tenantId: req.user.tenantId,
          userId: req.user.id,
          title: question.slice(0, 60),
          messages: [],
        });
      }

      conversation.messages.push({ role: 'user', text: question });

      const result = await answerQuestion(question, req.user, conversation.messages);

      conversation.messages.push({
        role: 'assistant',
        text: result.answer,
        citations: result.citations,
        confidence: result.confidence,
      });
      await conversation.save();

      // Audit every document actually surfaced in an answer (FR-9.1).
      for (const citation of result.citations) {
        await writeAudit({
          req,
          action: 'document.access',
          targetType: 'document',
          targetId: citation.documentId,
          metadata: { via: 'chat_citation', conversationId: conversation._id },
        });
      }

      const lastMessage = conversation.messages[conversation.messages.length - 1];
      res.status(200).json({
        conversationId: conversation._id,
        messageId: lastMessage._id,
        answer: result.answer,
        citations: result.citations,
        confidence: result.confidence,
      });
    } catch (err) {
      next(err);
    }
  },

  async submitFeedback(req, res, next) {
    try {
      const { messageId } = req.params;
      const { rating } = req.body;
      if (!['up', 'down'].includes(rating)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'rating must be "up" or "down".' } });
      }

      const conversation = await Conversation.findOne({ 'messages._id': messageId, userId: req.user.id });
      if (!conversation) return res.status(404).json({ error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found.' } });

      const message = conversation.messages.id(messageId);
      message.feedback = rating;
      await conversation.save();

      await evaluationService.recordFeedback({
        tenantId: req.user.tenantId,
        conversationId: conversation._id,
        messageId,
        rating,
        retrievalScoreAtTime: message.confidence,
      });

      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async listConversations(req, res, next) {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const filter = { userId: req.user.id, tenantId: req.user.tenantId, archived: false };
      const [items, total] = await Promise.all([
        Conversation.find(filter)
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .select('title createdAt updatedAt messages')
          .lean()
          .then((convos) => convos.map((c) => ({ ...c, messageCount: c.messages.length, messages: undefined }))),
        Conversation.countDocuments(filter),
      ]);
      res.status(200).json({ items, total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  async getConversation(req, res, next) {
    try {
      const conversation = await Conversation.findOne({
        _id: req.params.id,
        userId: req.user.id,
        tenantId: req.user.tenantId,
      }).lean();
      if (!conversation) return res.status(404).json({ error: { code: 'CONVERSATION_NOT_FOUND', message: 'Not found.' } });
      res.status(200).json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async updateConversation(req, res, next) {
    try {
      const { title, archived } = req.body;
      const update = {};
      if (title !== undefined) update.title = title;
      if (archived !== undefined) update.archived = archived;
      const conversation = await Conversation.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id, tenantId: req.user.tenantId },
        update,
        { new: true }
      );
      if (!conversation) return res.status(404).json({ error: { code: 'CONVERSATION_NOT_FOUND', message: 'Not found.' } });
      res.status(200).json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async deleteConversation(req, res, next) {
    try {
      await Conversation.deleteOne({ _id: req.params.id, userId: req.user.id, tenantId: req.user.tenantId });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
