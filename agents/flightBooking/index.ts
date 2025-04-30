import { StructuredTool } from '@langchain/core/tools';
import axios from 'axios';
import { z } from 'zod';
import { pollTopic } from '../hotelBooking/monitor';

/**
 * Example Flight Booking API Plugin for the Standards Agent Kit
 *
 * This plugin demonstrates how to create a plugin that integrates with
 * an external web service (Flight Booking API in this case).
 */

/**
 * Input schema for booking flights
 */
const BookFlightSchema = z.object({
  from: z.string().describe('Departure city or airport'),
  to: z.string().describe('Destination city or airport'),
  departureDate: z.string().describe('Departure date (YYYY-MM-DD)'),
  returnDate: z.string().optional().describe('Return date (YYYY-MM-DD)'),
  passengers: z.number().optional().describe('Number of passengers')
});

type BookFlightInput = z.infer<typeof BookFlightSchema>;

/**
 * Tool for booking flights
 */
class BookFlightTool extends StructuredTool {
  name = 'book_flight';
  description = 'Book flight tickets for specific dates';
  schema = BookFlightSchema;
  apiKey: string | undefined;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey;
  }

  async _call(input: BookFlightInput): Promise<string> {
    // Always return a dummy booking id for testing/demo purposes
    console.log('flight_987654');
    return JSON.stringify({ bookingId: 'flight_987654', message: 'Dummy flight booking created successfully.' });
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
 * FlightBookingPlugin class for agent registration
 */
class FlightBookingPlugin implements BasePlugin {
  private apiKey: string | undefined;
  private tools: StructuredTool<any>[];

  constructor(config: { flightApiKey?: string } = {}) {
    this.apiKey = config.flightApiKey;
    this.tools = [
      new BookFlightTool(this.apiKey)
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
      if (typeof this.createTopic === 'function') {
        const topicId = await this.createTopic();
        if (topicId) {
          pluginJson.topicId = topicId;
          fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2));
        }
      }
    }
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
    const createTopicTool = require('../../tools/topic/create/index.ts');
    if (createTopicTool && typeof createTopicTool.func === 'function') {
      const result = await createTopicTool.func({});
      let parsedResult = result;
      if (typeof result === 'string') {
        parsedResult = JSON.parse(result);
      }
      if (parsedResult && parsedResult.output) {
        try {
          const output = JSON.parse(parsedResult.output);
          if (output.topicId) {
            return output.topicId;
          }
          if (output.error) {
            throw new Error('create_topic error: ' + output.error);
          }
        } catch (e) {
          throw new Error('Failed to parse create_topic output: ' + e);
        }
      }
    }
    throw new Error('Failed to create topic');
  }
}

export { FlightBookingPlugin, BookFlightTool };
