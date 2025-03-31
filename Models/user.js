const mongoose=require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/CodeOverflow');
const userSchema=mongoose.Schema(
    {
        fname:String,
        lname:String,
        mob:Number,
        git:String,
        image:String,
        mail:String,
        pass:String,
        posts:[{
             type:mongoose.Schema.Types.ObjectId,
        ref:"posts"
        }],
        address:String
    }
)
module.exports=mongoose.model('user',userSchema);
