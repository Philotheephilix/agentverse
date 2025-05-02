import { BookHotelTool, processHotelMessage } from './agent.js';

export class HotelBookingPlugin {
  constructor() {
    this.name = 'Hotel Booking Plugin';
    this.id = 'hotel-booking-plugin';
  }
}

export class SearchHotelRoomsTool extends BookHotelTool {
  constructor(connection) {
    super(connection);
  }
}

export { processHotelMessage };
