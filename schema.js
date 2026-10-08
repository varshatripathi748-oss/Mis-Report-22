
const { buildSchema } = require("graphql");

const schema = buildSchema(`

    # ========================================
    # METER VALUES
    # ========================================

    type MeterValues {

        kwh: Float
        kvah: Float

        actualKwhConsumption: Float
        actualKvahConsumption: Float

        kvaMd: Float
        actualKvaMd: Float

        pfDisplay: Float
        pf: Float

    }


    # ========================================
    # METER READING
    # ========================================

    type MeterReading {

        id: ID!

        date: String!
        time: String!

        main: MeterValues!
        check: MeterValues!

        createdAt: String
        updatedAt: String

    }


    # ========================================
    # DASHBOARD KPI DATA
    # ========================================

    type Dashboard {

        records: Int!

        mainKwh: Float!
        mainKvah: Float!

        mainActualKwh: Float!
        mainActualKvah: Float!

        mainKvaMd: Float!
        mainPf: Float!

        checkKwh: Float!
        checkKvah: Float!

        checkActualKwh: Float!
        checkActualKvah: Float!

        checkKvaMd: Float!
        checkPf: Float!

    }


    # ========================================
    # METER FILTER
    # ========================================

    enum MeterFilter {

        ALL
        MAIN
        CHECK

    }


    # ========================================
    # QUERY
    # ========================================

    type Query {

        # Get meter records with optional date/meter filters
        meterReadings(
            from: String
            to: String
            meter: MeterFilter
        ): [MeterReading!]!


        # Get dashboard KPIs with optional date/meter filters
        dashboard(
            from: String
            to: String
            meter: MeterFilter
        ): Dashboard!

    }

`);

module.exports = schema;
