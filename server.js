```javascript
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { graphqlHTTP } = require("express-graphql");

const schema = require("./schema");
const resolvers = require("./resolver");
const { importWorkbook } = require("./import-excel");

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Temporary upload directory
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// Excel upload configuration
const upload = multer({
    dest: uploadDir,
    limits: {
        fileSize: 20 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();

        if (![".xlsx", ".xls"].includes(extension)) {
            return callback(
                new Error("Only .xlsx and .xls files are allowed.")
            );
        }

        callback(null, true);
    }
});

// Health check
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "MIS Dashboard Backend is running",
        graphql: `http://localhost:${PORT}/graphql`,
        excelImport: `http://localhost:${PORT}/api/import-excel`
    });
});

// GraphQL API
app.use(
    "/graphql",
    graphqlHTTP({
        schema,
        rootValue: resolvers,
        graphiql: true
    })
);

// Excel import API
app.post(
    "/api/import-excel",
    upload.single("file"),
    async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "Please select an Excel file."
            });
        }

        try {
            console.log(
                `Excel upload received: ${req.file.originalname}`
            );

            const result = await importWorkbook(req.file.path);

            return res.json({
                success: true,
                file: req.file.originalname,
                imported: result.imported,
                skipped: result.skipped,
                errors: result.errors || []
            });
        } catch (error) {
            console.error("Excel import failed:", error);

            return res.status(500).json({
                success: false,
                error: error.message || "Excel import failed."
            });
        } finally {
            fs.unlink(req.file.path, (error) => {
                if (error) {
                    console.warn(
                        "Could not delete temporary upload:",
                        error.message
                    );
                }
            });
        }
    }
);

// Not-found handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found"
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error("Server error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(error instanceof multer.MulterError ? 400 : 500).json({
        success: false,
        error: error.message || "Internal server error"
    });
});

// Start server
app.listen(PORT, () => {
    console.log("========================================");
    console.log("MIS DASHBOARD BACKEND");
    console.log(`Server:      http://localhost:${PORT}`);
    console.log(`GraphQL:     http://localhost:${PORT}/graphql`);
    console.log(`Excel Import: http://localhost:${PORT}/api/import-excel`);
    console.log("========================================");
});
```
