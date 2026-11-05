import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";
import multer from "multer";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const PORT = 5000;

// Enable CORS for all routes
const allowedOrigins = [
  "https://booknook-delta-blond.vercel.app",
  "http://localhost:3000",
];
app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
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

// ==========================================
// JWT verification
// Tokens are issued by better-auth (`jwt()` plugin) in the Next.js app and
// verified here against its public JWKS. Defaults match the local dev setup.
// ==========================================

const AUTH_JWKS_URL =
  process.env.AUTH_JWKS_URL ?? `${process.env.CLIENT_URL}/api/auth/jwks`;
const AUTH_ISSUER = process.env.AUTH_ISSUER ?? "http://localhost:3000";

const jwks = createRemoteJWKSet(new URL(AUTH_JWKS_URL));

// Requires a valid `Authorization: Bearer <jwt>` header.
// On success the verified user is attached to `req.user`.
async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res
      .status(401)
      .send({ message: "Please sign in to perform this action." });
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: AUTH_ISSUER,
      audience: AUTH_ISSUER,
    });

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    return next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res
      .status(401)
      .send({ message: "Your session is invalid or has expired." });
  }
}

app.post("/upload-image", requireAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({
        message: "Please select an image.",
      });
    }

    const formData = new FormData();

    formData.append("image", req.file.buffer.toString("base64"));

    const imgbbResponse = await fetch(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      {
        method: "POST",
        body: formData,
      },
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

app.post("/addbooks", requireAuth, async (req, res) => {
  // Ownership always comes from the verified token, never from the body.
  const data = {
    ...req.body,
    userEmail: req.user.email,
    userName: req.user.name,
  };
  const result = await addedBooks.insertOne(data);
  console.log(data);
  console.log(result);
  res.send({ message: "Server Is Running Fine!!!" });
});

app.get("/books", async (req, res) => {
  const books = await addedBooks.find().toArray();
  console.log(books);
  res.send(books);
});
app.get("/new-arrivals", async (req, res) => {
  const books = await addedBooks.find({}).sort({ _id: -1 }).limit(6).toArray();

  res.json(books);
});

app.get("/my-books/:email", requireAuth, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    if (email !== req.user.email) {
      return res
        .status(403)
        .send({ message: "You can only view your own books." });
    }

    const books = await addedBooks.find({ userEmail: email }).toArray();

    res.json(books);
  } catch (error) {
    console.error("Failed to get user's books:", error);
    res.status(500).send({ message: "Could not load your books." });
  }
});

app.get("/books/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  const book = await addedBooks.findOne({ _id: new ObjectId(id) });
  res.json(book);
});

app.patch("/books/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid book id." });
  }

  const book = await addedBooks.findOne({ _id: new ObjectId(id) });

  if (!book) {
    return res.status(404).send({ message: "Book not found." });
  }

  if (book.userEmail !== req.user.email) {
    return res
      .status(403)
      .send({ message: "You can only edit your own books." });
  }

  // Keep ownership tied to the token even if the body tries to change it.
  const updatedData = { ...req.body, userEmail: req.user.email };
  const result = await addedBooks.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData },
  );
  res.json(result);
});

app.delete("/books/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid book id." });
  }

  const book = await addedBooks.findOne({ _id: new ObjectId(id) });

  if (!book) {
    return res.status(404).send({ message: "Book not found." });
  }

  if (book.userEmail !== req.user.email) {
    return res
      .status(403)
      .send({ message: "You can only delete your own books." });
  }

  const result = await addedBooks.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

app.post("/borrowedbooks", requireAuth, async (req, res) => {
  try {
    const { bookId, bookTitle, bookImage, quantity } = req.body;

   // Identity always comes from the verified token, never from the body.
    const userEmail = req.user.email;
    const userName = req.user.name;

    // A borrow record only exists while the book is out (returns delete it),
    // so any existing record for this user + book means an active borrow.
    const existingBorrow = await BorrowedBooks.findOne({
      bookId,
      userEmail,
    });

    if (existingBorrow) {
      return res.status(409).json({
        message: "You have already borrowed this book.",
      });
    }

    const borrowQuantity = Number(quantity);

    if (
      !ObjectId.isValid(bookId) ||
      !Number.isInteger(borrowQuantity) ||
      borrowQuantity < 1
    ) {
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
      { returnDocument: "after" },
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

app.get("/my-borrows/:email", requireAuth, async (req, res) => {
  const { email } = req.params;

  if (email !== req.user.email) {
    return res
      .status(403)
      .send({ message: "You can only view your own borrows." });
  }

  const result = await BorrowedBooks.find({ userEmail: email }).toArray();
  res.json(result);
});

app.delete("/my-borrows/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid borrow id." });
  }

  const borrow = await BorrowedBooks.findOne({ _id: new ObjectId(id) });

  if (!borrow) {
    return res.status(404).send({ message: "Borrow record not found." });
  }

  if (borrow.userEmail !== req.user.email) {
    return res
      .status(403)
      .send({ message: "You can only return your own borrows." });
  }

  const result = await BorrowedBooks.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

//http://localhost:5000/books/ibtesammahid@gmail.com
app.get("/", (req, res) => {
  res.send({ message: "Welcome to Booknook API" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
