const { buildSchema } = require("graphql");

const schema = buildSchema(`
    type MeterReading {
        id: ID!
        date: String!
        time: String!
        meter: String!
        kwh: Float!
        kvah: Float!
        kvaMD: Float!
        previousKwh: Float
        actualKwh: Float!
        actualKvah: Float!
        powerFactor: Float!
    }

    input MeterReadingInput {
        date: String!
        time: String!
        meter: String!
        kwh: Float!
        kvah: Float!
        kvaMD: Float!
    }

    type Query {
        meterReadings: [MeterReading!]!
        meterReading(id: ID!): MeterReading
    }

    type Mutation {
        addMeterReading(input: MeterReadingInput!): MeterReading!
        updateMeterReading(
            id: ID!
            input: MeterReadingInput!
        ): MeterReading!
        deleteMeterReading(id: ID!): Boolean!
    }
`);

module.exports = schema;