# Agent Express

A simple Express application for creating and managing agents using the Hedera Standards Agent Kit.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Fill in your Hedera credentials in the `.env` file:
- `HEDERA_OPERATOR_ID`: Your Hedera operator ID
- `HEDERA_PRIVATE_KEY`: Your Hedera private key
- `HEDERA_NETWORK`: The Hedera network to use (testnet/mainnet)

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Create Agent
```http
POST /api/agent/create
Content-Type: application/json

{
  "name": "My Agent",
  "description": "Agent description",
  "profilePictureUrl": "https://example.com/image.jpg", // optional
  "tools": [] // optional
}
```

Response:
```json
{
  "jobId": "1234567890"
}
```

### Check Agent Status
```http
GET /api/agent/status?jobId=1234567890
```

Response:
```json
{
  "status": "completed",
  "result": {
    "agentMetadata": {
      "type": "agent",
      "name": "My Agent",
      "description": "Agent description",
      "accountId": "...",
      "topicId": "..."
    }
  }
}
```

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "ok"
}
``` 