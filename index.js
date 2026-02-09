const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Required for the BookLeaf testing tool [cite: 65, 67]
app.use(cors());
app.use(express.json());

// --- SEED DATA [cite: 18, 21, 28] ---
const authors = [
    { id: 1, name: "Priya Sharma", email: "priya@email.com", bank: "1234567890", ifsc: "HDFC0001234" },
    { id: 2, name: "Rahul Verma", email: "rahul@email.com", bank: "0987654321", ifsc: "ICIC0005678" },
    { id: 3, name: "Anita Desai", email: "anita@email.com", bank: "5678901234", ifsc: "SBIN0009012" }
];

const books = [
    { id: 1, author_id: 1, title: "The Silent River", royalty_per_sale: 45 },
    { id: 2, author_id: 1, title: "Midnight in Mumbai", royalty_per_sale: 60 },
    { id: 3, author_id: 2, title: "Code & Coffee", royalty_per_sale: 75 },
    { id: 4, author_id: 2, title: "Startup Diaries", royalty_per_sale: 50 },
    { id: 5, author_id: 2, title: "Poetry of Pain", royalty_per_sale: 30 },
    { id: 6, author_id: 3, title: "Garden of Words", royalty_per_sale: 40 }
];

const sales = [
    { book_id: 1, quantity: 25, date: "2025-01-05" },
    { book_id: 1, quantity: 40, date: "2025-01-12" },
    { book_id: 2, quantity: 15, date: "2025-01-08" },
    { book_id: 3, quantity: 60, date: "2025-01-03" },
    { book_id: 3, quantity: 45, date: "2025-01-15" },
    { book_id: 4, quantity: 30, date: "2025-01-10" },
    { book_id: 5, quantity: 20, date: "2025-01-18" },
    { book_id: 6, quantity: 10, date: "2025-01-20" }
];

let withdrawals = []; // Using in-memory storage [cite: 15]

// --- HELPER LOGIC [cite: 36, 38] ---
const getAuthorFinances = (authorId) => {
    const authorBooks = books.filter(b => b.author_id === authorId);
    let totalEarnings = 0;

    authorBooks.forEach(book => {
        const bookSales = sales.filter(s => s.book_id === book.id);
        const totalSold = bookSales.reduce((sum, s) => sum + s.quantity, 0);
        totalEarnings += totalSold * book.royalty_per_sale;
    });

    const totalWithdrawn = withdrawals
        .filter(w => w.author_id === authorId)
        .reduce((sum, w) => sum + w.amount, 0);

    return {
        total_earnings: totalEarnings,
        current_balance: totalEarnings - totalWithdrawn
    };
};

// --- ENDPOINTS [cite: 41] ---

// 1. GET /authors [cite: 42]
app.get('/authors', (req, res) => {
    const result = authors.map(a => ({
        id: a.id,
        name: a.name,
        ...getAuthorFinances(a.id)
    }));
    res.json(result);
});

// 2. GET /authors/{id} [cite: 45]
app.get('/authors/:id', (req, res) => {
    const authorId = parseInt(req.params.id);
    const author = authors.find(a => a.id === authorId);
    if (!author) return res.status(404).json({ error: "Author not found" }); 

    const finances = getAuthorFinances(authorId);
    const authorBooks = books.filter(b => b.author_id === authorId).map(b => {
        const bookSales = sales.filter(s => s.book_id === b.id);
        const totalSold = bookSales.reduce((sum, s) => sum + s.quantity, 0);
        return {
            id: b.id,
            title: b.title,
            royalty_per_sale: b.royalty_per_sale,
            total_sold: totalSold,
            total_royalty: totalSold * b.royalty_per_sale
        };
    });

    res.json({
        ...author,
        ...finances,
        total_books: authorBooks.length,
        books: authorBooks
    });
});

// 3. GET /authors/{id}/sales [cite: 49]
app.get('/authors/:id/sales', (req, res) => {
    const authorId = parseInt(req.params.id);
    const authorBooks = books.filter(b => b.author_id === authorId);
    
    let allSales = [];
    authorBooks.forEach(book => {
        const bookSales = sales.filter(s => s.book_id === book.id).map(s => ({
            book_title: book.title,
            quantity: s.quantity,
            royalty_earned: s.quantity * book.royalty_per_sale,
            sale_date: s.date
        }));
        allSales = [...allSales, ...bookSales];
    });

    // Sort newest first [cite: 50]
    allSales.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
    res.json(allSales);
});

// 4. POST /withdrawals [cite: 51]
app.post('/withdrawals', (req, res) => {
    const { author_id, amount } = req.body;
    const author = authors.find(a => a.id === author_id);

    if (!author) return res.status(404).json({ error: "Author not found" }); 
    if (amount < 500) return res.status(400).json({ error: "Minimum withdrawal is ₹500" }); 

    const { current_balance } = getAuthorFinances(author_id);
    if (amount > current_balance) return res.status(400).json({ error: "Insufficient balance" }); 

    const newWithdrawal = {
        id: withdrawals.length + 1,
        author_id,
        amount,
        status: "pending", 
        created_at: new Date().toISOString()
    };
    withdrawals.push(newWithdrawal);

    res.status(201).json({ ...newWithdrawal, new_balance: current_balance - amount }); 
});

// 5. GET /authors/{id}/withdrawals [cite: 62]
app.get('/authors/:id/withdrawals', (req, res) => {
    const authorId = parseInt(req.params.id);
    const authorWithdrawals = withdrawals
        .filter(w => w.author_id === authorId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); 
    res.json(authorWithdrawals);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port http://localhost:${PORT}`));