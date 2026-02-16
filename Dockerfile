FROM mcr.microsoft.com/playwright:v1.46.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
USER pwuser
EXPOSE 3000
CMD ["sh", "-c", "npm run migration:run && npm run start"]
