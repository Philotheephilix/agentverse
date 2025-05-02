import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentConnection, processMessage } from '../agent-common.js';

// Hotel booking tool schema
const BookHotelSchema = z.object({
  city: z.string().describe('City where to book a hotel'),
  checkin: z.string().describe('Check-in date in YYYY-MM-DD format'),
  checkout: z.string().describe('Check-out date in YYYY-MM-DD format'),
  guests: z.number().optional().describe('Number of guests'),
  roomType: z.string().optional().describe('Type of room: standard, deluxe, or suite'),
  connectionId: z.string().optional().describe('Connection ID for the conversation')
});

type BookHotelInput = z.infer<typeof BookHotelSchema>;

// Sample hotel data
const HOTELS = [
  {
    id: 'hotel-1',
    name: 'Grand Hotel',
    city: 'New York',
    description: 'Luxury hotel in downtown Manhattan',
    price: { standard: 200, deluxe: 300, suite: 500 },
    amenities: ['Pool', 'Spa', 'Gym', 'Restaurant']
  },
  {
    id: 'hotel-2',
    name: 'Ocean View Resort',
    city: 'Miami',
    description: 'Beachfront resort with amazing views',
    price: { standard: 250, deluxe: 350, suite: 600 },
    amenities: ['Beach access', 'Pool', 'Bar', 'Water sports']
  },
  {
    id: 'hotel-3',
    name: 'Mountain Lodge',
    city: 'Denver',
    description: 'Cozy lodge with mountain views',
    price: { standard: 180, deluxe: 260, suite: 400 },
    amenities: ['Fireplace', 'Hiking trails', 'Restaurant', 'Spa']
  }
];

// Hotel booking tool
class BookHotelTool extends StructuredTool {
  name = 'book_hotel';
  description = 'Book a hotel room for specific dates and location';
  schema = BookHotelSchema;
  
  constructor(private connection: AgentConnection) {
    super();
  }

  async _call(input: BookHotelInput): Promise<string> {
    // Find hotels in the requested city
    const cityHotels = HOTELS.filter(hotel => 
      hotel.city.toLowerCase() === input.city.toLowerCase());
    
    if (cityHotels.length === 0) {
      return JSON.stringify({
        success: false,
        message: `No hotels found in ${input.city}`
      });
    }
    
    // Select a hotel
    const selectedHotel = cityHotels[0];
    
    // Calculate total price
    const roomType = input.roomType || 'standard';
    const checkInDate = new Date(input.checkin);
    const checkOutDate = new Date(input.checkout);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const pricePerNight = selectedHotel.price[roomType as keyof typeof selectedHotel.price] || 
                        selectedHotel.price.standard;
    const totalPrice = nights * pricePerNight;
    
    // Generate booking confirmation
    const bookingNumber = `HB-${Date.now().toString().substr(-6)}`;
    
    const booking = {
      success: true,
      booking: {
        bookingNumber,
        hotel: selectedHotel.name,
        city: selectedHotel.city,
        checkin: input.checkin,
        checkout: input.checkout,
        nights,
        roomType,
        guests: input.guests || 1,
        pricePerNight,
        totalPrice,
        amenities: selectedHotel.amenities
      }
    };
    
    // If connectionId is provided, send booking confirmation
    if (input.connectionId && this.connection.tools.sendMessageToConnectionTool) {
      try {
        await this.connection.tools.sendMessageToConnectionTool.invoke({
          connectionId: input.connectionId,
          message: `✅ Booking Confirmed!
          
Booking #${bookingNumber}
Hotel: ${selectedHotel.name}, ${selectedHotel.city}
Stay: ${input.checkin} to ${input.checkout} (${nights} nights)
Room: ${roomType}
Guests: ${input.guests || 1}
Total: $${totalPrice}

Thank you for booking with HotelBooking Agent!`
        });
      } catch (error) {
      }
    }
    
    return JSON.stringify(booking);
  }
}

// Process messages for the hotel booking agent
export async function processHotelMessage(
  connection: AgentConnection,
  connectionTopicId: string,
  senderName: string,
  message: any
): Promise<void> {
  // Extract message content
  const content = message.content || message.data || JSON.stringify(message);
  
  try {
    // Simple NLP to detect booking intent
    const messageText = typeof content === 'string' ? content : JSON.stringify(content);
    
    if (messageText.toLowerCase().includes('book') && 
        messageText.toLowerCase().includes('hotel')) {
      
      // Extract potential city from message
      let city = 'New York'; // Default
      const cityMatches = messageText.match(/in\s+([A-Za-z\s]+)(?:from|for|on|to|\.|\?)/i);
      if (cityMatches && cityMatches[1]) {
        city = cityMatches[1].trim();
      }
      
      // Extract potential dates
      const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
      const dates = messageText.match(dateRegex) || [];
      
      let checkin = new Date();
      checkin.setDate(checkin.getDate() + 1);
      let checkout = new Date();
      checkout.setDate(checkout.getDate() + 3);
      
      if (dates.length >= 2) {
        checkin = new Date();
        checkout = new Date(dates[1]);
      } else if (dates.length === 1) {
        checkin = new Date(dates[0]);
        checkout = new Date(dates[0]);
        checkout.setDate(checkout.getDate() + 2);
      }
      
      // Format dates for the tool
      const checkinStr = checkin.toISOString().split('T')[0];
      const checkoutStr = checkout.toISOString().split('T')[0];
      
      // Create and use the booking tool
      const bookHotelTool = new BookHotelTool(connection);
      const result = await bookHotelTool._call({
        city,
        checkin: checkinStr,
        checkout: checkoutStr,
        guests: 2,
        connectionId: connectionTopicId
      });
      
      
    } else {
      // Send a general response
      if (connection.tools.sendMessageToConnectionTool) {
        await connection.tools.sendMessageToConnectionTool.invoke({
          connectionId: connectionTopicId,
          message: `Hello from the Hotel Booking Agent! 
          
I can help you book hotels worldwide. Just let me know where you'd like to stay, your check-in and check-out dates, and how many guests.

For example, you can say: "I'd like to book a hotel in New York from 2023-12-10 to 2023-12-15 for 2 guests."`,
        });
      }
    }
  } catch (error) {
    
    // Send error message
    if (connection.tools.sendMessageToConnectionTool) {
      await connection.tools.sendMessageToConnectionTool.invoke({
        connectionId: connectionTopicId,
        message: `Sorry, I encountered an error processing your request. Please try again or provide more details about the hotel you want to book.`,
      });
    }
  }
}
