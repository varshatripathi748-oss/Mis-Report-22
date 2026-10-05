const express = require("express");
const cors = require("cors");
const { graphqlHTTP } = require("express-graphql");

const schema = require("./schema");
const resolvers = require("./resolver");

const app = express();


// =========================
// CORS
// =========================
app.use(cors());


// =========================
// GRAPHQL
// =========================
app.use(
    "/graphql",
    graphqlHTTP({
        schema: schema,
        rootValue: resolvers,
        graphiql: true
    })
);


// =========================
// TEST ROUTE
// =========================
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "MIS Dashboard Backend is running"
    });
});


// =========================
// START SERVER
// =========================
const PORT = 4000;

app.listen(PORT, () => {
    console.log(`🚀 MIS Backend running on http://localhost:${PORT}`);
    console.log(`📊 GraphQL running on http://localhost:${PORT}/graphql`);
});