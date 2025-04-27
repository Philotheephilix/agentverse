const { StructuredTool } = require('@langchain/core/tools');
const axios = require('axios');
const z = require('zod');

/**
 * Example Hotel Booking API Plugin for the Standards Agent Kit
 * 
 * This plugin demonstrates how to create a plugin that integrates with
 * an external web service (Hotel Booking API in this case).
 */

/**
 * Tool for searching hotel rooms
 */
class SearchHotelRoomsTool extends StructuredTool {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.name = 'search_hotel_rooms';
    this.description = 'Search for available hotel rooms in a city for specific dates';
    this.schema = z.object({
      city: z.string().describe('The city to search hotels in'),
      checkin: z.string().describe('Check-in date (YYYY-MM-DD)'),
      checkout: z.string().describe('Check-out date (YYYY-MM-DD)'),
      guests: z.number().optional().describe('Number of guests')
    });
  }

  async _call(input) {
    if (!this.apiKey) {
      return 'Error: Hotel API key not configured. Please set hotelApiKey in the plugin configuration.';
    }

    try {
      // Replace with your actual hotel booking API endpoint and parameters
      const response = await axios.get('https://api.example.com/hotels/search', {
        params: {
          apiKey: this.apiKey,
          city: input.city,
          checkin: input.checkin,
          checkout: input.checkout,
          guests: input.guests || 1,
        }
      });
      return JSON.stringify(response.data);
    } catch (err) {
      return `Error: ${err.message}`;
    }
  }
}

/**
 * HotelBookingPlugin class for agent registration
 */
class HotelBookingPlugin extends BasePlugin {
  constructor(config = {}) {
    super();
    this.apiKey = config.hotelApiKey;
    this.tools = [
      new SearchHotelRoomsTool(this.apiKey)
    ];
  }

  async onLoad(context) {
    // Register tools with the agent context
    for (const tool of this.tools) {
      context.registerTool(tool);
    }
  }
}

module.exports = { HotelBookingPlugin, SearchHotelRoomsTool };