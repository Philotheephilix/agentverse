import { Client, TopicMessageQuery } from "@hashgraph/sdk";
import axios from 'axios';
import { MY_ACCOUNT_ID, MY_PRIVATE_KEY } from "../../utils/constants";
import { anchorSessionManager } from "./anchorSession";

// Import CommonJS module for topic message submission
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sendTopicMessageModule = require("../../tools/topic/submit/index");
// Import NFT minting agent
const mintNftModule = require("../../tools/mintNft/index");

const ANCHOR_API_KEY = process.env.ANCHOR_API_KEY || '';

/**
 * Sends a message to a Hedera topic using the tools/topic/submit module.
 * @param user string
 * @param message string
 * @returns Promise<any>
 */
export async function sendTopicMessage(user: string, message: string): Promise<any> {
  return sendTopicMessageModule.func({ topicId:user,message: message });
}


/**
 * Calls the NFT minting agent with booking confirmation metadata.
 * @param agentName string
 * @param chosenUrl string
 * @param confirmationId string
 */
export async function mintNftConfirmationAgent(agentName: string, chosenUrl: string, confirmationId: string) {
  const metadata = JSON.stringify({ agentName, chosenUrl, confirmationId });
  return mintNftModule.func({
    tokenName: "Booking Confirmation NFT",
    tokenSymbol: "BOOKNFT",
    maxSupply: 1,
    metadata
  });
}

export async function pollTopic(user: string) {
  console.log(`[MONITOR] pollTopic called for topic: ${user}`);
  const urls = {
    hotel: "https://agentverse-hotel.vercel.app/",
    flight: "https://agentverse-flight.vercel.app/",
    food: "https://agentverse-food.vercel.app/"
  };

  const client = Client.forTestnet();
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

  // Monitor only after server start time
  const startTime = new Date();
  console.log(`[MONITOR] Subscribing from time: ${startTime.toISOString()}`);

  new TopicMessageQuery()
    .setTopicId(user)
    .setStartTime(startTime)
    .subscribe(
      client,
      (error) => {
        console.error("[MONITOR] Error while polling topic:", error);
      },
      async (message) => {
        try {
          const rawContent = Buffer.from(message.contents).toString("utf-8");
          await new Promise((resolve) => setTimeout(resolve, 7000));
          let content = rawContent;
          let user = '';
          try {
            const parsed = JSON.parse(rawContent);
            if (parsed && typeof parsed === 'object') {
              user = parsed.User || '';
              content = parsed.prompt || '';
            }
          } catch (err) {
            console.warn('[MONITOR] Could not parse content as JSON, using raw string:', err);
          }
          console.log(
            `[MONITOR] Received message #${message.sequenceNumber}: User=${user}, prompt=${content}`
          );

          // 1. Use AI to analyze and choose url
          let chosenUrlKey: keyof typeof urls = 'hotel';
          try {
            const aiResp = await axios.post(
              'http://localhost:3000/api/ask',
              { prompt: `Given the following request, choose one of: hotel, flight, food. Only reply with the single word: hotel, flight, or food. Request: ${content}` }
            );
            const aiChoice = (aiResp.data.output || '').trim().toLowerCase();
            if (['hotel', 'flight', 'food'].includes(aiChoice)) {
              chosenUrlKey = aiChoice as keyof typeof urls;
            }
          } catch (err) {
            console.error('[MONITOR] AI analysis failed, defaulting to hotel:', err);
          }
          const chosenUrl = urls[chosenUrlKey];
          console.log(`[MONITOR] Chosen URL: ${chosenUrl}`);
          sendTopicMessage(user, `Chosen Booking site URL: ${chosenUrl}`)
          // 2. Create Anchor Browser session
          let session;
          try {
            session = await anchorSessionManager.initializeSession(ANCHOR_API_KEY);
            console.log('[MONITOR] Anchor session initialized:', session.id);
            console.log('[MONITOR] Live view URL:', session.live_view_url);
            sendTopicMessage(user, session.live_view_url);
          } catch (err) {
            console.error('[MONITOR] Anchor session creation failed:', err);
            return;
          }

          // 3. Use perform-web-task to find price
          let price = null;
          try {
            const findPricePrompt = `Find the price of the order/booking for the following request: ${content}`;
            const priceResp = await anchorSessionManager.performWebTask(
              ANCHOR_API_KEY,
              chosenUrl,
              findPricePrompt
            );
            // Anchor API returns { result: ... }
            price = priceResp?.result || JSON.stringify(priceResp);
            console.log(`[MONITOR] Found price:`, price.result.result);
            sendTopicMessage(user, typeof price === 'string' ? price : JSON.stringify(price));
          } catch (err) {
            console.error('[MONITOR] Error finding price:', err);
          }

          // 4. Use perform-web-task to book and get confirmation id
          try {
            const bookPrompt = `Book and give the booking confirmation number for the following request: ${content}`;
            const bookResp = await anchorSessionManager.performWebTask(
              ANCHOR_API_KEY,
              chosenUrl,
              bookPrompt
            );
            // Anchor API returns { result: ... }
            const confirmationId = bookResp?.result || JSON.stringify(bookResp);
            console.log(`[MONITOR] Booking confirmation ID:`, confirmationId.result.result);
            sendTopicMessage(user, typeof confirmationId === 'string' ? confirmationId : JSON.stringify(confirmationId));
            // Call NFT minting agent with confirmation metadata
            try {
              const nftResult = await mintNftConfirmationAgent(
                'hotel-booking',
                chosenUrl,
                confirmationId.result.result
              );
              console.log('[MONITOR] NFT Minting Result:', nftResult);
              sendTopicMessage(user, `${nftResult}`);
            } catch (nftErr) {
              console.error('[MONITOR] Error minting NFT:', nftErr);
              sendTopicMessage(user, `[NFT Minting Error] ${nftErr}`);
            }
          } catch (err) {
            console.error('[MONITOR] Error booking and getting confirmation ID:', err);
          }
        } catch (e) {
          console.error("[MONITOR] Error decoding message:", e, message);
        }
      }
    );

  console.log("[MONITOR] Subscription started for topic:", user);
}

process.on('uncaughtException', (err) => {
  console.error('[MONITOR] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[MONITOR] Unhandled Rejection:', reason);
});
