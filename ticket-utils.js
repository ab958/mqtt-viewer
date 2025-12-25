// ============================================
// ticket-utils.js
// Utility functions for ticket ID processing
// ============================================

/**
 * Recursively searches for ticket ID in nested objects
 * Looks for: ticket.id, ticketId, ticket_id, TICKET_ID, etc.
 * 
 * @param {Object} obj - The object to search
 * @param {number} depth - Current recursion depth
 * @param {number} maxDepth - Maximum recursion depth
 * @returns {number|null} - The ticket ID or null if not found
 */
function findTicketId(obj, depth = 0, maxDepth = 10) {
  if (depth > maxDepth || obj == null) return null;

  // If it's not an object, return null
  if (typeof obj !== 'object') return null;

  // Check common ticket ID patterns (case-insensitive keys)
  for (const key in obj) {
    const lowerKey = key.toLowerCase();
    
    // Direct match patterns
    if (lowerKey === 'ticketid' || lowerKey === 'ticket_id') {
      const val = obj[key];
      if (typeof val === 'number' || (typeof val === 'string' && !isNaN(val))) {
        return Number(val);
      }
    }
    
    // Nested ticket object
    if (lowerKey === 'ticket' && typeof obj[key] === 'object') {
      const ticketObj = obj[key];
      if (ticketObj.id != null) {
        const val = ticketObj.id;
        if (typeof val === 'number' || (typeof val === 'string' && !isNaN(val))) {
          return Number(val);
        }
      }
    }

    if (lowerKey === 'ticketdata' && typeof obj[key] === 'object') {
      const ticketObj = obj[key];
      if (ticketObj[0].id != null) {
        const val = ticketObj[0].id;
        if (typeof val === 'number' || (typeof val === 'string' && !isNaN(val))) {
          return Number(val);
        }
      }
    }
  }

  // Recursively search nested objects and arrays
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      const found = findTicketId(obj[key], depth + 1, maxDepth);
      if (found !== null) return found;
    }
  }

  console.log(`✗ Could not find ticket ID at depth ${depth}`);
  return null;
}

/**
 * Generates visually distinct colors using golden ratio
 * Ensures consecutive numbers get very different colors
 * 
 * @param {number|null} ticketId - The ticket ID
 * @returns {string} - HSL color string
 */
function getTicketColor(ticketId) {
  if (ticketId == null) {
    return '#6b7280'; // Gray for no ticket ID
  }

  // Golden ratio for maximum color distribution
  const golden = 0.618033988749895;
  
  // Use golden ratio to spread hue values
  const hue = (ticketId * golden * 360) % 360;
  
  // High saturation and good lightness for visibility
  const saturation = 65 + (ticketId % 20); // 65-85%
  const lightness = 45 + (ticketId % 15);  // 45-60%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Export for Node.js (if needed for server-side)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findTicketId,
    getTicketColor
  };
}