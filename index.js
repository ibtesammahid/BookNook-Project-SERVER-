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
const BorrowedBooks = db.collection("borrowedBooks");

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

app.get("/my-books/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    const books = await addedBooks
      .find({ userEmail: email })
      .toArray();

    res.send(books);
  } catch (error) {
    console.error("Failed to get user's books:", error);
    res.status(500).send({ message: "Could not load your books." });
  }
});

app.get('/books/:id', async (req, res) => {
  const { id } = req.params;
  console.log(id);
  const book = await addedBooks.findOne({ _id: new ObjectId(id) });
  res.send(book);
});

app.patch('/books/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const result = await addedBooks.updateOne(
    { _id: new ObjectId(id)},
    { $set: updatedData }
  )
  res.json(result)
})



// app.post('/borrowedbooks', async (req, res) => {
//   const data = req.body;
//   const result = await BorrowedBooks.insertOne(data);
//   res.send({ message: "Book borrowed successfully!", data: result });
// }); 

app.post("/borrowedbooks", async (req, res) => {
  try {
    const { bookId, bookTitle, bookImage, userName, userEmail, quantity } = req.body;

     const borrowQuantity = Number(quantity);

    if (!ObjectId.isValid(bookId) || !Number.isInteger(borrowQuantity) || borrowQuantity < 1) {
      return res.status(400).send({ message: "Invalid book or quantity." });
    }

    // Decrease copies only if enough are available.
    const updatedBook = await addedBooks.findOneAndUpdate(
      {
        _id: new ObjectId(bookId),
        totalCopies: { $gte: borrowQuantity },
      },
      {
        $inc: { totalCopies: -borrowQuantity },
      },
      { returnDocument: "after" }
    );

    if (!updatedBook) {
      return res.status(400).send({
        message: "Not enough copies available.",
      });
    }

    const borrowDate = new Date();
    const returnDate = new Date(borrowDate);
    returnDate.setDate(returnDate.getDate() + 14); // due in 14 days

    const borrowedBook = {
      bookId,
      bookTitle,
      bookImage,
      userName,
      userEmail,
      quantity,
      borrowDate,
      returnDate,
    };

    const result = await BorrowedBooks.insertOne(borrowedBook);

    res.status(201).send({
      message: "Book borrowed successfully!",
      data: result,
    });
  } catch (error) {
    console.error("Borrow error:", error);
    res.status(500).send({ message: "Could not borrow this book." });
  }
});

app.get('/my-borrows/:email', async (req, res) => {
  const {email} = req.params;
  const result = await BorrowedBooks.find({ userEmail:email }).toArray();
  res.send(result);
});

app.delete('/my-borrows/:id', async (req, res) => {
  const { id } = req.params;
  const result = await BorrowedBooks.deleteOne({ _id: id});
  res.send(result);
});


//http://localhost:5000/books/ibtesammahid@gmail.com
app.get("/", (req, res) => {
  res.send({ message: "Welcome to Booknook API" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
