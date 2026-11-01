import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config';
import cors from "cors";
import multer from "multer";

const app = express();
const PORT = 5000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});
const mongoclient = await connectToMongoDB();
const db = mongoclient.db("booknook");
const addedBooks = db.collection("addedBooks");

app.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({
        message: "Please select an image.",
      });
    }

    const formData = new FormData();

    formData.append(
      "image",
      req.file.buffer.toString("base64")
    );

    const imgbbResponse = await fetch(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await imgbbResponse.json();

    if (!imgbbResponse.ok || !result.success) {
      return res.status(500).send({
        message: "Image upload to ImgBB failed.",
      });
    }

    res.status(200).send({
      message: "Image uploaded successfully!",
      imageUrl: result.data.url,
    });
  } catch (error) {
    console.error("ImgBB upload error:", error);

    res.status(500).send({
      message: "Something went wrong while uploading the image.",
    });
  }
});

app.post("/addbooks", async (req, res) => {
    const data = req.body;
    const result = await addedBooks.insertOne(data);
    console.log(data);
    console.log(result);
    res.send({ message: "Server Is Running Fine!!!" })
})

app.get('/books', async (req, res) => {
  const books = await addedBooks.find().toArray();
  console.log(books);
  res.send(books);
})

app.get('/books/:id', async (req, res) => {
  const { id } = req.params;
  console.log(id);
  const book = await addedBooks.findOne({ _id: new ObjectId(id) });
  res.send(book);
});


//http://localhost:5000/addbooks
app.get("/", (req, res) => {
  res.send({ message: "Welcome to Booknook API" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
