const axios = require("axios");

axios.post("http://localhost:5000/api/chat", {
  sessionId: "test123",
  message: "suggest a good budget bluetooth headphone under 1500 rupees",
})
.then((res) => console.log(JSON.stringify(res.data, null, 2)))
.catch((err) => console.error("ERROR:", err.response?.data || err.message));