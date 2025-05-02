import { BookFlightTool, processFlightBookingMessage } from './agent.js';

export class FlightBookingPlugin {
  constructor() {
    this.name = 'Flight Booking Plugin';
    this.id = 'flight-booking-plugin';
  }
}

export { BookFlightTool, processFlightBookingMessage };
