import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "6928bba57cb1e77b7cc8d915", 
  requiresAuth: true // Ensure authentication is required for all operations
});
