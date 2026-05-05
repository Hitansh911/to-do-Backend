FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Running in dev mode so hot-reloading works when you paste new code!
CMD ["npm", "run", "dev"]