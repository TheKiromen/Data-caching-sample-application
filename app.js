//Express
const express = require('express');
const app = express();
const port = 3000;
const parser = require('body-parser');
app.use(parser.json())
app.use(parser.urlencoded({ extended: true }))
//Mongo
const uri = '<<<YOUR MONGO CONNECTION STRING HERE>>>';
const mongo = require('mongodb').MongoClient;
let MongoID = require('mongodb').ObjectId;
let mongoCollection;
mongo.connect(uri,(err,db) =>{
    if(err){
        console.log(err);
        process.exit(0);
    }
    mongoCollection=db.db('<<<YOUR COLLECTION NAME HERE>>>');
    console.log('Connected to MongoDB.')
});
//Redis
const redis = require('redis').createClient();
redis.connect();

redis.on('connect',function() {
    console.log('Connected to Redis.');
});



//----------------------------------Cache-aside----------------------------------//
app.get('/CA/:id',async (req, res) => {
    let keys,result,id=req.params.id;
    //Check for data in cache
    result = await redis.hGetAll(id);
    keys=Object.keys(result);

    //Cache hit
    if(keys.length>0){
        console.log("cache hit");
        //Return redis data
        res.send(result);
    }
    //Cache miss
    else{
        console.log("cache miss");
        //Get data from mongo
        await mongoCollection.collection('caching').findOne({_id:new MongoID(id)},async (err, result) =>{
            keys=Object.keys(result);
            keys.shift();
            //Save data to cache
            for (const key of keys) {
                await redis.hSet(id,key,result[key]);
            }
            //Return data
            await res.send(result)
        })
    }
})

//----------------------------------Read-through----------------------------------//
app.get('/RT/:id',async (req, res) => {
    let keys,result,id=req.params.id;
    //Find data in redis
    result = await redis.hGetAll(id);
    keys=Object.keys(result);

    //Cache hit
    if(keys.length>0){
        console.log("cache hit");
        //Return redis data
        res.send(result);
    }
    //Cache miss
    else{
        console.log("cache miss");
        //Get data from mongo
        await mongoCollection.collection('caching').findOne({_id:new MongoID(id)},async (err, result) =>{
            keys=Object.keys(result);
            keys.shift();
            //Save data to cache
            for (const key of keys) {
                await redis.hSet(id,key,result[key]);
            }
            //Return data
            await res.send(await redis.hGetAll(id));
        })
    }
})

//----------------------------------Write-through----------------------------------//
app.post('/WT',async (req, res) => {
    let id,keys,object;
    id=new MongoID();
    keys=Object.keys(req.body);

    //Insert to redis
    for(const key of keys){
        await redis.hSet(id.toString(),key,req.body[key]);
    }

    //Get inserted object from redis
    object=await redis.hGetAll(id.toString());
    object["_id"]=id;

    //Insert to mongo
    await mongoCollection.collection('caching').insertOne(object);
    res.sendStatus(201);
})

//----------------------------------Write-back----------------------------------//
app.post('/WB',async (req, res) => {
    let id,keys,object;
    id=new MongoID();
    keys=Object.keys(req.body);

    //Insert to redis
    for(const key of keys){
        await redis.hSet(id.toString(),key,req.body[key]);
    }

    //Get inserted object from redis
    object=await redis.hGetAll(id.toString());
    object["_id"]=id;

    res.sendStatus(201);
    //Insert to mongo without blocking the app
    mongoCollection.collection('caching').insertOne(object);
})

//----------------------------------Write-around----------------------------------//
//Write
app.post('/WA',async (req, res) => {
    let id = new MongoID();
    let object = req.body;
    object["_id"]=id;
    await mongoCollection.collection('caching').insertOne(object);
    res.sendStatus(201);
})
//Read
app.get('/WA/:id',async (req, res) => {
    let keys,result,id=req.params.id;
    //Get data from redis
    result = await redis.hGetAll(id);
    keys=Object.keys(result);

    //Cache hit
    if(keys.length>0){
        console.log("Cache hit");
        //Return data from cache
        res.send(result);
    }
    //Cache miss
    else{
        console.log("cache miss");
        //Get data from mongo
        await mongoCollection.collection('caching').findOne({_id:new MongoID(id)},async (err, result) =>{
            keys=Object.keys(result);
            keys.shift();
            //Save data to cache
            for (const key of keys) {
                await redis.hSet(id,key,result[key]);
            }
            //Return data to client
            await res.send(result)
        })
    }

})



app.listen(port, () => {
    console.log(`App started on port ${port}`)
})