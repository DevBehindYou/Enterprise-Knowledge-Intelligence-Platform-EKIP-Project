FROM node:20-alpine
WORKDIR /app

# pdf2pic (used for scanned-PDF OCR rasterization) shells out to GraphicsMagick + Ghostscript.
RUN apk add --no-cache graphicsmagick ghostscript

COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]
