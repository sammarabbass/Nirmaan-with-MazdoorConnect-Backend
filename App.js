
const services=require("./Root/server")

services.listen(process.env.PORT,()=>{
    console.log(`server is runing on the port ${process.env.PORT}`);  
})