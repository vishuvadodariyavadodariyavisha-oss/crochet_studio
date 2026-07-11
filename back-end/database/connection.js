const { default: mongoose} = require("mongoose");

mongoose.connect(process.env.DB_URL).then(()=>{
    console.log("Database connected successfully");
}).catch((err)=>{
    console.log("Database connection failed");
    console.log(err);
});