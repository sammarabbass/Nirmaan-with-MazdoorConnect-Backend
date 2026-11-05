
const services=require("./Root/server")

const PORT = process.env.PORT || 5000;

services.listen(PORT, "0.0.0.0", () => {
  console.log(`server is running on port ${PORT}`);
});