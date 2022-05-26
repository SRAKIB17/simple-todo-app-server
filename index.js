const express = require('express');

const app = express()
const cors = require('cors');

const jwt = require('jsonwebtoken');
require('dotenv').config()

app.use(express.json())
app.use(cors())

const port = process.env.PORT || 5000;


// for payment 
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


// for database 

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { async } = require('@firebase/util');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lhv3r.mongodb.net/?retryWrites=true&w=majority`;


// for token verify ------------------------------------------------------------
const verifyJWT = (req, res, next) => {

    const auth = req.headers.authorize
    if (!auth) {
        res.status(401).send({ message: 'unauthorize access' })
    }
    const token = auth?.split(' ')[1];

    jwt.verify(token, process.env.SECRET_CODE, (error, decoded) => {
        if (error) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next()
    })

}



app.get('/verify-user', verifyJWT, (req, res) => {
    res.send({ message: 'user check' })
}) 

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const run = async () => {
    await client.connect()

    const ProductsCollection = client.db('CAR_MANUFACTURER').collection('Products');
    const ordersCollection = client.db('CAR_MANUFACTURER').collection('Orders');
    const reviewCollection = client.db('CAR_MANUFACTURER').collection('Review');
    const usersCollection = client.db('CAR_MANUFACTURER').collection('Users');

    // ____________________________________for access jwt admin protected area 
    app.get('/login', async (req, res) => {
        const email = req.query.email;
        const token = jwt.sign({ email }, process.env.SECRET_CODE, {
            expiresIn: '2h'
        })
        res.send({ token })
    })

    app.get('/admin', verifyJWT, async (req, res) => {
        const { email } = req.decoded;
        const findAdmin = await usersCollection.findOne({ email })
        if (findAdmin?.roll === 'admin') {
            res.send({ admin: true })
        }
        else {
            res.send({ admin: false })
        }

    })

    const verifyAdmin = async (req, res, next) => {
        const { email } = req.decoded;
        const findAdmin = await usersCollection.findOne({ email });
        if (findAdmin?.roll === 'admin') {
            next()
        }
        else {
            res.status(401).send({ message: 'unauthorize access' })
        }
    }
    // get Product ; 
    app.get('/products', async (req, res) => {
        const query = req.query;

        const products = await ProductsCollection.find(query).toArray()
        res.send(products)
    })

    // get Product ; 
    app.get('/product/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const result = await ProductsCollection.findOne(query);
        res.send(result)
    })




    // for add product 
    app.post('/order', verifyJWT, async (req, res) => {
        const order = req.body;
        const result = await ordersCollection.insertOne(order);
        res.send(result)
    })
    // for get specific order
    app.get('/order', verifyJWT, async (req, res) => {

        const query = req.query;

        const result = await ordersCollection.find(query).toArray()
        res.send(result)

    })


                
    // ___________________________for delete order of user
    app.get('/order/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const result = await ordersCollection.findOne(query);
        res.send(result)

    })
    app.delete('/order/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;

        const query = { _id: ObjectId(id) }

        const result = await ordersCollection.deleteOne(query);
        res.send(result)

    })

    // for review get 
    app.get('/review', async (req, res) => {
        const page = parseInt(req.query.page);
        const skip = parseInt(req.query.skip);

        const cursor = reviewCollection.find({}).limit(skip).skip(page * skip);
        const review = await cursor.toArray()
        res.send(review)
    })
    // for review 

    app.post('/review', verifyJWT, async (req, res) => {

        const review = req.body;
        const result = await reviewCollection.insertOne(review)
        res.send(result)
    })

    // ---------------add or remov and admin ------------------------

    app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
        const email = req.query.email;
        const result = await usersCollection.find({}).toArray()
        res.send(result)
    })

    app.put('/user', async (req, res) => {
        const email = req.query.email;
        const user = req.body;
        const uid = user.uid;

        const option = { upsert: true }

        const uBody = {
            $set: user
        }
        const result = await usersCollection.updateOne({ uid: user.uid }, uBody, option);

    })

    app.put('/modify-user/:id', verifyJWT, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const method = req.query.method;
        const filter = { _id: ObjectId(id) }

        if (method === 'add') {
            const updateDoc = {
                $set: { roll: 'admin' }
            }
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)
        }
        else if (method === 'remove') {



            const updateDoc = {
                $set: { roll: 'user' }
            }
            const result = await usersCollection.updateOne(filter, updateDoc);
            console.log(result)
            res.send(result)
        }
    })
     
    app.delete('/user/:id', verifyJWT, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }

        const result = await usersCollection.deleteOne(query);
        res.send(result)
    })
    // ------------------------------for admin get order -----------------------------



    // get product one
    app.get('/product-admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const result = await ProductsCollection.findOne(query);
        res.send(result)
    })

    // get all order 
    app.get('/all-order', verifyJWT, verifyAdmin, async (req, res) => {
        const result = await ordersCollection.find({}).toArray();
        res.send(result);
    })

    // ____________________admin can  product this api _______________________________
    app.post('/add-product', async (req, res) => {
        const product = req.body;
        const result = await ProductsCollection.insertOne(product);
        res.send(result);
    })

    // admin get all product 
    app.get('/all-product', async (req, res) => {
        const result = await ProductsCollection.find({}).toArray()
        res.send(result)
    })

    // update 
    app.put('/product/:id', async (req, res) => {
        const id = req.params.id
        const filter = { _id: ObjectId(id) }

        const updateDoc = {
            $set: req.body
        }
        const result = await ProductsCollection.updateOne(filter, updateDoc);
        res.send(result)
    })

    // get delete by id 
    app.delete('/product/:id', async (req, res) => {
        const id = req.params.id;
        console.log(id)
        const query = { _id: ObjectId(id) }
        const result = await ProductsCollection.deleteOne(query)
        res.send(result)
    })


    // FOR  payment stripe back
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
        const { price } = req.body;
       
        const amount = Number(price) * 100;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            payment_method_types: ['card'],

        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    })


}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Server running successfully');
})

app.listen(port, () => {
    console.log('server new     Running')
})