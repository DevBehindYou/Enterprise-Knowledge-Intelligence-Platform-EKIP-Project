import { authService } from '../services/authService.js';
import { validatePassword, validateEmail } from '../utils/validators.js';
import { writeAudit } from '../middleware/auditWrite.js';

export const authController = {
  async signup(req, res, next) {
    try {
      const { name, email, password, department } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name, email, and password are required.' } });
      }
      // The frontend's minLength={8} is a UI hint only — it enforces nothing for
      // a direct API call, so the real gate has to live here, not just in React.
      const emailError = validateEmail(email);
      if (emailError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: emailError } });
      }
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: passwordError } });
      }
      const user = await authService.signup({ name, email, password, department });
      res.status(201).json({ userId: user._id, email: user.email, status: user.status });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password }, res);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const result = await authService.refresh(req, res);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      await authService.logout(req, res);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      await authService.forgotPassword({ email: req.body.email });
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      // req.user is already populated by requireAuth middleware on this route.
      const user = await authService.getCurrentUser(req.user.id);
      res.status(200).json({ user: user || req.user });
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req, res, next) {
    try {
      const { name, notificationPreferences } = req.body;
      if (name === undefined && notificationPreferences === undefined) {
        return res
          .status(400)
          .json({ error: { code: 'VALIDATION_ERROR', message: 'Nothing to update.' } });
      }
      const user = await authService.updateProfile(req.user.id, { name, notificationPreferences });
      await writeAudit({ req, action: 'user.profile_update', targetType: 'user', targetId: req.user.id });
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'currentPassword and newPassword are required.' },
        });
      }
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: passwordError } });
      }
      if (currentPassword === newPassword) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'The new password must be different from the current one.' },
        });
      }
      await authService.changePassword(req.user.id, { currentPassword, newPassword });
      await writeAudit({ req, action: 'user.password_change', targetType: 'user', targetId: req.user.id });
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async logoutEverywhere(req, res, next) {
    try {
      await authService.logoutEverywhere(req.user.id, res);
      await writeAudit({ req, action: 'user.logout_all', targetType: 'user', targetId: req.user.id });
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
