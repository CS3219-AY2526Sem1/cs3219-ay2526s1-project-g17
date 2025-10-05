/**
 * Service for handling matching-related API calls
 */

/**
 * Fetches available topics from the server
 * Currently returns dummy data as the backend endpoint is not implemented
 * @returns {Promise<string[]>} Array of topic strings
 */
export const fetchTopics = async () => {
  // TODO: Replace with actual API call when backend is ready
  // const response = await fetch('/api/topics');
  // return response.json();

  // Dummy implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        "Binary Tree",
        "Array",
        "Dynamic Programming",
        "Graph",
        "Hash Table",
        "Two Pointers",
        "Sliding Window",
        "Backtracking",
        "Binary Search",
        "Linked List",
        "Stack",
        "Queue",
      ]);
    }, 500); // Simulate network delay
  });
};

/**
 * Submits a matching request to the server
 * @param {Object} matchRequest - The matching request object
 * @returns {Promise<Object>} Server response
 */
export const submitMatchRequest = async (matchRequest) => {
  // TODO: Replace with actual API call when backend is ready
  console.log("Submitting match request:", matchRequest);

  // Dummy implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: "Match request submitted successfully",
        requestId: Math.random().toString(36).substr(2, 9),
      });
    }, 1000);
  });
};
