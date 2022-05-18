const express = require('express');

const app = express()
const cors = require('cors');

require('dotenv').config()
app.use(express.json())
app.use(cors())
const port = process.env.PORT || 5000;

app.get('/', (req, res)=>{
    res.send('server running successfully')
})

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v6ue1.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () =>{
    try{
        await client.connect()
        const todoAppCollection = client.db('Note').collection('TodoNote')

        // for add todo note 
        app.get('/note', async(req, res)=>{
            const email = req.query.email;
            
            const result = await todoAppCollection.find({email: email}).toArray()

            res.send(result)
        }) 

        app.post('/note', async(req, res)=>{
            const note = req.body;
            console.log(note)
            const result = await todoAppCollection.insertOne(note);
            res.send(result)
        })
        
        app.put('/note/:id', async(req, res)=>{
            const id = req.params.id;
            const doc = {
                $set: req.body 
            }
            const option = {upsert: true}
            const query = {_id: ObjectId(id)} 
            
            const result = await todoAppCollection.updateOne(query, doc, option);
            res.send(result)
        }) 

        app.delete('/note/:id', async(req, res)=>{
            const id = req.params.id;

            const query = {_id: ObjectId(id)}
            const result = await todoAppCollection.deleteOne(query);
            res.send(result)
        })

    }
    finally{

    }
}
run().catch(console.dir)
app.listen(port, ()=>{
    console.log('running successfully')
}) 