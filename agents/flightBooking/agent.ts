import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentConnection } from '../agent-common';
import { Logger } from '@hashgraphonline/standards-sdk';

// Flight booking tool schema
const BookFlightSchema = z.object({
  origin: z.string().describe('Origin airport or city'),
  destination: z.string().describe('Destination airport or city'),
  departureDate: z.string().describe('Departure date in YYYY-MM-DD format'),
  returnDate: z.string().optional().describe('Return date in YYYY-MM-DD format (for round trips)'),
  passengerCount: z.number().default(1).describe('Number of passengers'),
  cabinClass: z.string().optional().describe('Cabin class: economy, premium economy, business, or first'),
  connectionId: z.string().optional().describe('Connection ID for the conversation')
});

type BookFlightInput = z.infer<typeof BookFlightSchema>;

// Sample flight data
const FLIGHTS = [
  {
    id: 'flight-1',
    airline: 'SkyHigh Airways',
    flightNumber: 'SH101',
    origin: 'New York',
    destination: 'Los Angeles',
    departureTime: '08:30',
    arrivalTime: '11:45',
    duration: '5h 15m',
    price: { economy: 299, premium: 499, business: 899, first: 1499 }
  },
  {
    id: 'flight-2',
    airline: 'Global Air',
    flightNumber: 'GA205',
    origin: 'Los Angeles',
    destination: 'New York',
    departureTime: '14:15',
    arrivalTime: '22:30',
    duration: '5h 15m',
    price: { economy: 329, premium: 529, business: 929, first: 1599 }
  },
  {
    id: 'flight-3',
    airline: 'Atlantic Wings',
    flightNumber: 'AW300',
    origin: 'New York',
    destination: 'London',
    departureTime: '19:45',
    arrivalTime: '07:30',
    duration: '6h 45m',
    price: { economy: 649, premium: 849, business: 1499, first: 2499 }
  },
  {
    id: 'flight-4',
    airline: 'Pacific Routes',
    flightNumber: 'PR780',
    origin: 'San Francisco',
    destination: 'Tokyo',
    departureTime: '13:20',
    arrivalTime: '17:40',
    duration: '11h 20m',
    price: { economy: 899, premium: 1299, business: 2299, first: 3499 }
  }
];

// Add many more city pairs
const CITY_PAIRS = [
  { origin: 'Chicago', destination: 'Miami' },
  { origin: 'Boston', destination: 'Seattle' },
  { origin: 'Denver', destination: 'Phoenix' },
  { origin: 'Washington', destination: 'Dallas' },
  { origin: 'Atlanta', destination: 'San Diego' },
  { origin: 'Houston', destination: 'Detroit' },
  { origin: 'Philadelphia', destination: 'Portland' },
  { origin: 'Miami', destination: 'Las Vegas' }
];

// Flight booking tool
class BookFlightTool extends StructuredTool {
  name = 'book_flight';
  description = 'Book a flight between two cities';
  schema = BookFlightSchema;
  
  constructor(private connection: AgentConnection) {
    super();
  }

  async _call(input: BookFlightInput): Promise<string> {
    const logger = Logger.getInstance({
      module: 'FlightBookingTool',
      level: 'debug',
    });
    
    logger.info(`Booking flight from ${input.origin} to ${input.destination} on ${input.departureDate}`);
    
    // Find matching flights
    let matchingFlights = FLIGHTS.filter(flight => 
      flight.origin.toLowerCase() === input.origin.toLowerCase() && 
      flight.destination.toLowerCase() === input.destination.toLowerCase());
    
    // If no exact matches, try to create a virtual flight for this route
    if (matchingFlights.length === 0) {
      const virtualFlight = {
        id: `flight-v${Date.now()}`,
        airline: ['SkyHigh Airways', 'Global Air', 'Atlantic Wings', 'Pacific Routes'][Math.floor(Math.random() * 4)],
        flightNumber: `VS${Math.floor(Math.random() * 1000)}`,
        origin: input.origin,
        destination: input.destination,
        departureTime: `${Math.floor(Math.random() * 12 + 6)}:${Math.floor(Math.random() * 6)}${Math.floor(Math.random() * 10)}`,
        arrivalTime: `${Math.floor(Math.random() * 12 + 6)}:${Math.floor(Math.random() * 6)}${Math.floor(Math.random() * 10)}`,
        duration: `${Math.floor(Math.random() * 8 + 1)}h ${Math.floor(Math.random() * 60)}m`,
        price: { 
          economy: Math.floor(Math.random() * 300 + 200),
          premium: Math.floor(Math.random() * 400 + 400),
          business: Math.floor(Math.random() * 800 + 800),
          first: Math.floor(Math.random() * 1500 + 1500)
        }
      };
      
      matchingFlights = [virtualFlight];
    }
    
    // Select the best flight (first one for simplicity)
    const selectedFlight = matchingFlights[0];
    
    // Calculate total price
    const cabinClass = (input.cabinClass || 'economy').toLowerCase();
    const cabinMapping: Record<string, keyof typeof selectedFlight.price> = {
      'economy': 'economy',
      'premium economy': 'premium',
      'premium': 'premium',
      'business': 'business',
      'first': 'first'
    };
    
    const actualCabinClass = cabinMapping[cabinClass] || 'economy';
    const pricePerPerson = selectedFlight.price[actualCabinClass];
    const totalPrice = pricePerPerson * input.passengerCount;
    
    // Generate booking confirmation
    const bookingNumber = `FB-${Date.now().toString().substr(-6)}`;
    
    const departureDateObj = new Date(input.departureDate);
    const departureDay = departureDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    let returnInfo = {};
    if (input.returnDate) {
      const returnFlight = {
        ...selectedFlight,
        origin: selectedFlight.destination,
        destination: selectedFlight.origin,
        departureTime: `${Math.floor(Math.random() * 12 + 6)}:${Math.floor(Math.random() * 6)}${Math.floor(Math.random() * 10)}`,
        arrivalTime: `${Math.floor(Math.random() * 12 + 6)}:${Math.floor(Math.random() * 6)}${Math.floor(Math.random() * 10)}`,
      };
      
      const returnDateObj = new Date(input.returnDate);
      const returnDay = returnDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      
      returnInfo = {
        returnFlight: {
          airline: returnFlight.airline,
          flightNumber: `${returnFlight.flightNumber.slice(0, -2)}${Math.floor(Math.random() * 100)}`,
          origin: returnFlight.origin,
          destination: returnFlight.destination,
          departureDate: returnDay,
          departureTime: returnFlight.departureTime,
          arrivalTime: returnFlight.arrivalTime,
          duration: returnFlight.duration
        }
      };
    }
    
    const booking = {
      success: true,
      booking: {
        bookingNumber,
        type: input.returnDate ? 'Round-trip' : 'One-way',
        passengers: input.passengerCount,
        cabin: actualCabinClass.charAt(0).toUpperCase() + actualCabinClass.slice(1),
        outboundFlight: {
          airline: selectedFlight.airline,
          flightNumber: selectedFlight.flightNumber,
          origin: selectedFlight.origin,
          destination: selectedFlight.destination,
          departureDate: departureDay,
          departureTime: selectedFlight.departureTime,
          arrivalTime: selectedFlight.arrivalTime,
          duration: selectedFlight.duration
        },
        ...returnInfo,
        pricePerPerson,
        totalPrice
      }
    };
    
    // If connectionId is provided, send booking confirmation
    if (input.connectionId && this.connection.tools.sendMessageToConnectionTool) {
      try {
        let confirmationMessage = `✈️ Flight Booking Confirmed!
          
Booking #${bookingNumber}
${input.returnDate ? 'Round-trip' : 'One-way'} - ${input.passengerCount} passenger(s) - ${actualCabinClass.charAt(0).toUpperCase() + actualCabinClass.slice(1)} class

OUTBOUND:
${selectedFlight.airline} ${selectedFlight.flightNumber}
From: ${selectedFlight.origin} at ${selectedFlight.departureTime}
To: ${selectedFlight.destination} at ${selectedFlight.arrivalTime}
Date: ${departureDay}
Duration: ${selectedFlight.duration}`;

        if (input.returnDate) {
          const returnFlight = (booking.booking as any).returnFlight;
          confirmationMessage += `

RETURN:
${returnFlight.airline} ${returnFlight.flightNumber}
From: ${returnFlight.origin} at ${returnFlight.departureTime}
To: ${returnFlight.destination} at ${returnFlight.arrivalTime}
Date: ${returnFlight.departureDate}
Duration: ${selectedFlight.duration}`;
        }
        
        confirmationMessage += `

Price per passenger: $${pricePerPerson}
Total price: $${totalPrice}

Thank you for booking with Flight Booking Agent!`;
        
        await this.connection.tools.sendMessageToConnectionTool.invoke({
          connectionId: input.connectionId,
          message: confirmationMessage
        });
      } catch (error) {
        logger.error('Error sending booking confirmation:', error);
      }
    }
    
    return JSON.stringify(booking);
  }
}

// Process messages for the flight booking agent
export async function processFlightBookingMessage(
  connection: AgentConnection,
  connectionTopicId: string,
  senderName: string,
  message: any
): Promise<void> {
  const logger = Logger.getInstance({
    module: 'FlightBookingAgent',
    level: 'debug',
  });
  
  // Extract message content
  const content = message.content || message.data || JSON.stringify(message);
  logger.info(`Processing flight booking message: ${content}`);
  
  try {
    // Simple NLP to detect booking intent
    const messageText = typeof content === 'string' ? content : JSON.stringify(content);
    
    if (messageText.toLowerCase().includes('book') && 
        messageText.toLowerCase().includes('flight')) {
      
      // Extract origin and destination
      let origin = 'New York';
      let destination = 'Los Angeles';
      
      // Try to find "from X to Y" pattern
      const routeMatch = messageText.match(/from\s+([A-Za-z\s]+)(?:to|and)\s+([A-Za-z\s]+)/i);
      if (routeMatch && routeMatch[1] && routeMatch[2]) {
        origin = routeMatch[1].trim();
        destination = routeMatch[2].trim();
      }
      
      // Extract dates
      const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
      const dates = messageText.match(dateRegex) || [];
      
      let departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + 7);
      let returnDate: Date | null = null;
      
      if (dates.length >= 2) {
        departureDate = new Date();
        returnDate = new Date(dates[1]);
      } else if (dates.length === 1) {
        departureDate = new Date(dates[0]);
        // Check if it's a round trip
        if (messageText.toLowerCase().includes('round') && 
            messageText.toLowerCase().includes('trip')) {
          returnDate = new Date(dates[0]);
          returnDate.setDate(returnDate.getDate() + 7);
        }
      }
      
      // Extract passenger count
      let passengerCount = 1;
      const passengersMatch = messageText.match(/(\d+)\s+passenger/i);
      if (passengersMatch && passengersMatch[1]) {
        passengerCount = parseInt(passengersMatch[1]);
      }
      
      // Extract cabin class
      let cabinClass = 'economy';
      if (messageText.toLowerCase().includes('business')) {
        cabinClass = 'business';
      } else if (messageText.toLowerCase().includes('first')) {
        cabinClass = 'first';
      } else if (messageText.toLowerCase().includes('premium')) {
        cabinClass = 'premium';
      }
      
      // Format dates
      const departureDateStr = departureDate.toISOString().split('T')[0];
      const returnDateStr = returnDate ? returnDate.toISOString().split('T')[0] : undefined;
      
      // Create and use the booking tool
      const bookFlightTool = new BookFlightTool(connection);
      const result = await bookFlightTool._call({
        origin,
        destination,
        departureDate: departureDateStr,
        returnDate: returnDateStr,
        passengerCount,
        cabinClass,
        connectionId: connectionTopicId
      });
      
      logger.info(`Flight booking result: ${result}`);
      
    } else {
      // Send a general response
      if (connection.tools.sendMessageToConnectionTool) {
        // Get a random selection of 3 city pairs
        const shuffled = [...FLIGHTS, ...CITY_PAIRS].sort(() => 0.5 - Math.random());
        const routes = shuffled.slice(0, 3).map(route => 
          `- ${route.origin} to ${route.destination}`
        ).join('\n');
        
        await connection.tools.sendMessageToConnectionTool.invoke({
          connectionId: connectionTopicId,
          message: `Hello from the Flight Booking Agent! 
          
I can help you book flights worldwide. Just let me know your:
- Origin city/airport
- Destination city/airport
- Departure date (YYYY-MM-DD)
- Return date (for round trips)
- Number of passengers
- Preferred cabin class

Popular routes:
${routes}

For example, you can say: "I'd like to book a flight from New York to London on 2023-07-15, returning on 2023-07-22 for 2 passengers in business class."`,
        });
      }
    }
  } catch (error) {
    logger.error(`Error processing flight booking message:`, error);
    
    // Send error message
    if (connection.tools.sendMessageToConnectionTool) {
      await connection.tools.sendMessageToConnectionTool.invoke({
        connectionId: connectionTopicId,
        message: `Sorry, I encountered an error processing your flight booking request. Please try again with details about your origin, destination, and travel dates.`,
      });
    }
  }
}
