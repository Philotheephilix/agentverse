import { StructuredTool } from '@langchain/core/tools';
import axios from 'axios';
import { z } from 'zod';

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
  guests: z.number().optional().describe('Number of guests')
});

type SearchHotelRoomsInput = z.infer<typeof SearchHotelRoomsSchema>;

/**
 * Tool for searching hotel rooms
 */
class SearchHotelRoomsTool extends StructuredTool {
  name = 'search_hotel_rooms';
  description = 'Search for available hotel rooms in a city for specific dates';
  schema = SearchHotelRoomsSchema;
  apiKey: string | undefined;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey;
  }

  async _call(input: SearchHotelRoomsInput): Promise<string> {
    if (!this.apiKey) {
      return 'Error: Hotel API key not configured. Please set hotelApiKey in the plugin configuration.';
    }

    try {
      const response = await axios.get('https://api.example.com/hotels/search', {
        params: {
          apiKey: this.apiKey,
          city: input.city,
          checkin: input.checkin,
          checkout: input.checkout,
          guests: input.guests ?? 1,
        }
      });
      return JSON.stringify(response.data);
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
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
    for (const tool of this.tools) {
      context.registerTool(tool);
    }
  }
}

export { HotelBookingPlugin, SearchHotelRoomsTool };
