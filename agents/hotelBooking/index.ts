import { StructuredTool } from '@langchain/core/tools';
import axios from 'axios' 
import { z } from 'zod';
import { pollTopic } from './monitor';
/**
 * Example Hotel Booking API Plugin for the Standards Agent Kit
 *
 * This plugin demonstrates how to create a plugin that integrates with
 * an external web service (Hotel Booking API in this case).
 */

/**
 * Input schema for searching hotel rooms
 */
const SearchHotelRoomsSchema = z.object({
  city: z.string().describe('The city to search hotels in'),
  checkin: z.string().describe('Check-in date (YYYY-MM-DD)'),
  checkout: z.string().describe('Check-out date (YYYY-MM-DD)'),
  guests: z.number().optional().describe('Number of guests'),
  topicId: z.string().describe('User topic id for messaging')
});

type SearchHotelRoomsInput = z.infer<typeof SearchHotelRoomsSchema>;

/**
 * Tool for searching hotel rooms
 */
class SearchHotelRoomsTool extends StructuredTool {
  name = 'book_hotel_room';
  description = 'book hotel rooms for specific dates';
  schema = SearchHotelRoomsSchema;
  apiKey: string | undefined;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey;
  }

  async _call(input: SearchHotelRoomsInput & { topicId?: string }): Promise<string> {
    // Call browserTestingAiTool and pass topicId if present
    const { browserTestingAiTool } = await import('../../tools/browserTestingAi');
    let prompt = `Book hotel rooms with the details given in the json and use default value if not present + ${JSON.stringify(input)}`;
    if (input.topicId) {
      prompt = `[userTopicId: ${input.topicId}] ` + prompt;
    }
    const params = input.topicId ? { input: prompt, topicId: input.topicId } : { input: prompt };
    const result = await browserTestingAiTool(params);
    return JSON.stringify({
      output: typeof result.finalResult === 'string' ? result.finalResult : JSON.stringify(result.finalResult)
    });
  }
}

/**
 * BasePlugin interface stub (you need to replace it with the real one if you have)
 */
interface PluginContext {
  registerTool(tool: StructuredTool<any>): void;
}

interface BasePlugin {
  onLoad(context: PluginContext): Promise<void>;
}

/**
 * HotelBookingPlugin class for agent registration
 */
class HotelBookingPlugin implements BasePlugin {
  private apiKey: string | undefined;
  private tools: StructuredTool<any>[];

  constructor(config: { hotelApiKey?: string } = {}) {
    this.apiKey = config.hotelApiKey;
    this.tools = [
      new SearchHotelRoomsTool(this.apiKey)
    ];
  }

  async onLoad(context: PluginContext): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const pluginJsonPath = path.join(__dirname, 'plugin.json');
    let pluginJson: any = {};
    if (fs.existsSync(pluginJsonPath)) {
      try {
        const data = fs.readFileSync(pluginJsonPath, 'utf8');
        pluginJson = JSON.parse(data);
      } catch {
        pluginJson = {};
      }
    }
    // Check for topicId (can be inboundTopicId, outboundTopicId, or your own key)
    if (!pluginJson.topicId) {
      // Assume createTopic is an async function you have access to
      if (typeof this.createTopic === 'function') {
        const topicId = await this.createTopic();
        if (topicId) {
          pluginJson.topicId = topicId;
          fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2));
        }
      }
    }
    // Import and call pollTopic if topicId is available
    if (pluginJson.topicId) {
      try {
        pollTopic(pluginJson.topicId);
      } catch (e) {
        console.error('Failed to start topic monitor:', e);
      }
    }
    for (const tool of this.tools) {
      context.registerTool(tool);
    }
  }

  // Use the create_topic tool to create a topic
  private async createTopic(): Promise<string> {
    // Dynamically import the create topic tool
    const createTopicTool = require('../../tools/topic/create/index.ts');
    if (createTopicTool && typeof createTopicTool.func === 'function') {
      const result = await createTopicTool.func({});
      if (result && result.output) {
        try {
          const output = JSON.parse(result.output);
          if (output.topicId) {
            return output.topicId;
          }
        } catch (e) {
          // Failed to parse output
        }
      }
    }
    throw new Error('Failed to create topic');
  }
}

export { HotelBookingPlugin, SearchHotelRoomsTool };
