// =====================================================
// LOCAL STORAGE
// =====================================================

let meterData =
    JSON.parse(localStorage.getItem("meterData")) || [];


// =====================================================
// FORM ELEMENTS
// =====================================================

const meterFormSection =
    document.getElementById("meterFormSection");

const meterForm =
    document.getElementById("meterForm");

const readingDate =
    document.getElementById("readingDate");

const readingTime =
    document.getElementById("readingTime");

const kwhInput =
    document.getElementById("kwhReading");

const kvahInput =
    document.getElementById("kvahReading");

const kvaMDInput =
    document.getElementById("kvaMD");

const meterNameInput =
    document.getElementById("meterName");


// =====================================================
// OPEN METER FORM
// =====================================================

function openMeterForm() {

    // Main meter page show
    document.getElementById("mainMeterPage").style.display =
        "block";

    // Dashboard hide
    document.getElementById("dashboardPage").style.display =
        "none";

    // Form show
    meterFormSection.classList.add("show");

    // Default date and time
    setDefaultDateTime();

    // Update calculation
    updatePreviousReading();

    calculateConsumption();

    // Form tak automatically scroll
    meterFormSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// =====================================================
// CLOSE FORM
// =====================================================

function closeMeterForm() {

    meterFormSection.classList.remove("show");
}


// =====================================================
// DEFAULT DATE & TIME
// =====================================================

function setDefaultDateTime() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1).padStart(2, "0");

    const day =
        String(now.getDate()).padStart(2, "0");

    readingDate.value =
        `${year}-${month}-${day}`;

    readingTime.value =
        now.toTimeString().slice(0, 5);
}


// =====================================================
// GET PREVIOUS RECORD OF SAME METER
// =====================================================

function getPreviousRecord(meterName) {

    const meterRecords =
        meterData.filter(
            record =>
                record.meter === meterName
        );

    if (meterRecords.length === 0) {
        return null;
    }

    meterRecords.sort(
        (a, b) => {

            const dateA =
                new Date(
                    `${a.date}T${a.time}`
                );

            const dateB =
                new Date(
                    `${b.date}T${b.time}`
                );

            return dateB - dateA;
        }
    );

    return meterRecords[0];
}


// =====================================================
// GET PREVIOUS KWH
// =====================================================

function getPreviousKwh() {

    const meterName =
        meterNameInput.value;

    if (!meterName) {
        return null;
    }

    const previousRecord =
        getPreviousRecord(meterName);

    if (!previousRecord) {
        return null;
    }

    return Number(previousRecord.kwh);
}


// =====================================================
// UPDATE PREVIOUS READING
// =====================================================

function updatePreviousReading() {

    const previousKwh =
        getPreviousKwh();

    const previousElement =
        document.getElementById("previousKwh");

    if (
        previousKwh === null ||
        isNaN(previousKwh)
    ) {

        previousElement.textContent =
            "No Previous Data";

    } else {

        previousElement.textContent =
            previousKwh.toFixed(3);
    }
}


// =====================================================
// CALCULATE CONSUMPTION
// =====================================================

function calculateConsumption() {

    const currentKwh =
        parseFloat(kwhInput.value);

    const kvaMD =
        parseFloat(kvaMDInput.value);

    const previousKwh =
        getPreviousKwh();


    // =================================================
    // PREVIOUS KWH
    // =================================================

    if (previousKwh === null) {

        document.getElementById(
            "previousKwh"
        ).textContent =
            "No Data";

    } else {

        document.getElementById(
            "previousKwh"
        ).textContent =
            previousKwh.toFixed(3);
    }


    // =================================================
    // ACTUAL KWH
    //
    // (Current KWH - Previous KWH) × 120
    // =================================================

    let actualKwh = 0;

    if (
        previousKwh !== null &&
        !isNaN(currentKwh)
    ) {

        actualKwh =
            (currentKwh - previousKwh) * 120;

        if (actualKwh < 0) {
            actualKwh = 0;
        }
    }


    document.getElementById(
        "actualKwh"
    ).textContent =
        actualKwh.toFixed(3);


    // =================================================
    // ACTUAL KVAH
    //
    // KVA MD × 120
    // =================================================

    let actualKvah = 0;

    if (!isNaN(kvaMD)) {

        actualKvah =
            kvaMD * 120;
    }


    document.getElementById(
        "actualKvah"
    ).textContent =
        actualKvah.toFixed(3);


    // =================================================
    // POWER FACTOR
    //
    // Actual KWH / Actual KVAH
    // =================================================

    let powerFactor = 0;

    if (actualKvah > 0) {

        powerFactor =
            actualKwh / actualKvah;
    }


    document.getElementById(
        "powerFactor"
    ).textContent =
        powerFactor.toFixed(3);
}


// =====================================================
// LIVE CALCULATION
// =====================================================

kwhInput.addEventListener(
    "input",
    calculateConsumption
);

kvahInput.addEventListener(
    "input",
    calculateConsumption
);

kvaMDInput.addEventListener(
    "input",
    calculateConsumption
);


// =====================================================
// METER CHANGE
// =====================================================

meterNameInput.addEventListener(
    "change",
    function () {

        updatePreviousReading();

        calculateConsumption();
    }
);


// =====================================================
// SAVE READING
// =====================================================

meterForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        const date =
            readingDate.value;

        const time =
            readingTime.value;

        const meter =
            meterNameInput.value;

        const kwh =
            parseFloat(kwhInput.value);

        const kvah =
            parseFloat(kvahInput.value);

        const kvaMD =
            parseFloat(kvaMDInput.value);


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !date ||
            !time ||
            !meter ||
            isNaN(kwh) ||
            isNaN(kvah) ||
            isNaN(kvaMD)
        ) {

            alert(
                "Please enter all meter details."
            );

            return;
        }


        // =================================================
        // PREVIOUS SAME METER READING
        // =================================================

        const previousKwh =
            getPreviousKwh();


        // =================================================
        // ACTUAL KWH
        // =================================================

        let actualKwh = 0;

        if (previousKwh !== null) {

            actualKwh =
                (kwh - previousKwh) * 120;

            if (actualKwh < 0) {
                actualKwh = 0;
            }
        }


        // =================================================
        // ACTUAL KVAH
        // =================================================

        const actualKvah =
            kvaMD * 120;


        // =================================================
        // POWER FACTOR
        // =================================================

        let powerFactor = 0;

        if (actualKvah > 0) {

            powerFactor =
                actualKwh / actualKvah;
        }


        // =================================================
        // CREATE RECORD
        // =================================================

        const newRecord = {

            id: Date.now(),

            date: date,

            time: time,

            meter: meter,

            kwh: kwh,

            kvah: kvah,

            kvaMD: kvaMD,

            previousKwh: previousKwh,

            actualKwh: actualKwh,

            actualKvah: actualKvah,

            powerFactor: powerFactor
        };


        // =================================================
        // SAVE DATA
        // =================================================

        meterData.push(newRecord);


        localStorage.setItem(
            "meterData",
            JSON.stringify(meterData)
        );


        // =================================================
        // SUCCESS MESSAGE
        // =================================================

        alert(
            meter +
            " reading saved successfully!"
        );


        // =================================================
        // RESET FORM
        // =================================================

        meterForm.reset();


        document.getElementById(
            "previousKwh"
        ).textContent = "--";

        document.getElementById(
            "actualKwh"
        ).textContent = "--";

        document.getElementById(
            "actualKvah"
        ).textContent = "--";

        document.getElementById(
            "powerFactor"
        ).textContent = "--";


        closeMeterForm();


        // =================================================
        // UPDATE SCREEN
        // =================================================

        updateDashboard();

        updateRecentData();

        displayMeterData();

        updatePowerChart();
    }
);


// =====================================================
// SHOW DASHBOARD
// =====================================================

function showDashboard() {

    document.getElementById(
        "mainMeterPage"
    ).style.display = "none";

    closeMeterForm();

    document.getElementById(
        "dashboardPage"
    ).style.display = "block";

    updateDashboard();

    updateRecentData();

    updatePowerChart();
}


// =====================================================
// SHOW MAIN METER PAGE
// =====================================================

function showMainMeter() {

    document.getElementById(
        "dashboardPage"
    ).style.display = "none";

    closeMeterForm();

    document.getElementById(
        "mainMeterPage"
    ).style.display = "block";

    displayMeterData();
}


// =====================================================
// DISPLAY METER DATA
// =====================================================

function displayMeterData(data = meterData) {

    const tableBody =
        document.getElementById(
            "meterTableBody"
        );

    if (!tableBody) {
        return;
    }


    if (data.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="no-data"
                >
                    No meter data available.
                    Click "+ Add New Reading" to enter data.
                </td>
            </tr>
        `;

        return;
    }


    const sortedData =
        data
        .slice()
        .sort(
            (a, b) => {

                const dateA =
                    new Date(
                        `${a.date}T${a.time}`
                    );

                const dateB =
                    new Date(
                        `${b.date}T${b.time}`
                    );

                return dateB - dateA;
            }
        );


    tableBody.innerHTML =
        sortedData
        .map(
            record => {

                return `
                    <tr>

                        <td>
                            ${record.date}
                        </td>

                        <td>
                            ${record.time}
                        </td>

                        <td>
                            <strong>
                                ${record.meter}
                            </strong>
                        </td>

                        <td>
                            ${Number(record.kwh).toFixed(3)}
                        </td>

                        <td>
                            ${Number(record.kvah).toFixed(3)}
                        </td>

                        <td>
                            ${Number(record.kvaMD).toFixed(3)}
                        </td>

                        <td>
                            ${Number(record.actualKwh).toFixed(3)}
                        </td>

                        <td>
                            ${Number(record.actualKvah).toFixed(3)}
                        </td>

                        <td>
                            ${Number(record.powerFactor).toFixed(3)}
                        </td>

                        <td>

                            <button
                                class="action-btn edit-btn"
                                onclick="editMeterData(${record.id})"
                            >
                                Edit
                            </button>

                            <button
                                class="action-btn delete-btn"
                                onclick="deleteMeterData(${record.id})"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


// =====================================================
// SEARCH
// =====================================================

const meterSearch =
    document.getElementById(
        "meterSearch"
    );


if (meterSearch) {

    meterSearch.addEventListener(
        "input",
        function () {

            const searchValue =
                this.value
                    .toLowerCase()
                    .trim();


            const filteredData =
                meterData.filter(
                    record => {

                        return (

                            record.date
                                .toLowerCase()
                                .includes(searchValue)

                            ||

                            record.meter
                                .toLowerCase()
                                .includes(searchValue)

                        );
                    }
                );


            displayMeterData(
                filteredData
            );
        }
    );
}


// =====================================================
// SHOW ALL DATA
// =====================================================

function showAllMeterData() {

    if (meterSearch) {

        meterSearch.value = "";
    }

    displayMeterData(meterData);
}


// =====================================================
// DELETE DATA
// =====================================================

function deleteMeterData(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this reading?"
        );


    if (!confirmDelete) {
        return;
    }


    meterData =
        meterData.filter(
            record =>
                record.id !== id
        );


    localStorage.setItem(
        "meterData",
        JSON.stringify(meterData)
    );


    displayMeterData();

    updateDashboard();

    updateRecentData();

    updatePowerChart();


    alert(
        "Reading deleted successfully!"
    );
}


// =====================================================
// EDIT DATA
// =====================================================

function editMeterData(id) {

    const record =
        meterData.find(
            item =>
                item.id === id
        );


    if (!record) {
        return;
    }


    // Main Meter page
    showMainMeter();


    // Open form
    meterFormSection.classList.add("show");


    // Fill values

    readingDate.value =
        record.date;

    readingTime.value =
        record.time;

    meterNameInput.value =
        record.meter;

    kwhInput.value =
        record.kwh;

    kvahInput.value =
        record.kvah;

    kvaMDInput.value =
        record.kvaMD;


    updatePreviousReading();

    calculateConsumption();


    // Remove old record
    meterData =
        meterData.filter(
            item =>
                item.id !== id
        );


    localStorage.setItem(
        "meterData",
        JSON.stringify(meterData)
    );


    meterFormSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });


    displayMeterData();
}


// =====================================================
// DASHBOARD UPDATE
// =====================================================

function updateDashboard() {

    const recordCount =
        document.getElementById(
            "dataRecords"
        );


    if (recordCount) {

        recordCount.textContent =
            meterData.length;
    }


    if (meterData.length === 0) {

        document.getElementById(
            "dashboardPF"
        ).textContent = "--";

        document.getElementById(
            "dashboardKvaMD"
        ).textContent = "--";

        document.getElementById(
            "msebConsumption"
        ).textContent = "--";

        return;
    }


    // Main Meter records only

    const mainMeterRecords =
        meterData.filter(
            record =>
                record.meter === "Main Meter"
        );


    if (mainMeterRecords.length === 0) {

        document.getElementById(
            "dashboardPF"
        ).textContent = "--";

        document.getElementById(
            "dashboardKvaMD"
        ).textContent = "--";

        document.getElementById(
            "msebConsumption"
        ).textContent = "0";

        return;
    }


    // Latest Main Meter record

    const lastRecord =
        mainMeterRecords
        .slice()
        .sort(
            (a, b) => {

                return new Date(
                    `${b.date}T${b.time}`
                ) -
                new Date(
                    `${a.date}T${a.time}`
                );
            }
        )[0];


    // Power Factor

    document.getElementById(
        "dashboardPF"
    ).textContent =
        Number(
            lastRecord.powerFactor
        ).toFixed(3);


    // KVA MD

    document.getElementById(
        "dashboardKvaMD"
    ).textContent =
        Number(
            lastRecord.kvaMD
        ).toFixed(3);


    // Total Main Meter consumption

    const totalConsumption =
        mainMeterRecords.reduce(
            (
                total,
                record
            ) => {

                return total +
                    Number(
                        record.actualKwh
                    );
            },
            0
        );


    document.getElementById(
        "msebConsumption"
    ).textContent =
        totalConsumption.toFixed(2);
}


// =====================================================
// RECENT DATA
// =====================================================

function updateRecentData() {

    const tableBody =
        document.getElementById(
            "recentDataBody"
        );


    if (!tableBody) {
        return;
    }


    if (meterData.length === 0) {

        tableBody.innerHTML = `
            <tr>

                <td>--</td>

                <td>--</td>

                <td>--</td>

                <td>--</td>

                <td>No Data</td>

            </tr>
        `;

        return;
    }


    const recentRecords =
        meterData
        .slice()
        .sort(
            (a, b) => {

                return new Date(
                    `${b.date}T${b.time}`
                ) -
                new Date(
                    `${a.date}T${a.time}`
                );
            }
        )
        .slice(0, 5);


    tableBody.innerHTML =
        recentRecords
        .map(
            record => {

                return `
                    <tr>

                        <td>
                            ${record.date}
                        </td>

                        <td>
                            ${record.meter}
                        </td>

                        <td>
                            ${Number(record.kwh).toFixed(3)}
                            kWh
                        </td>

                        <td>
                            ${Number(record.actualKwh).toFixed(3)}
                            kWh
                        </td>

                        <td>
                            <span
                                style="
                                    background:#dcfce7;
                                    color:#166534;
                                    padding:5px 9px;
                                    border-radius:5px;
                                "
                            >
                                Saved
                            </span>
                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


// =====================================================
// POWER CONSUMPTION CHART
// =====================================================

let powerConsumptionChart = null;


function updatePowerChart() {

    const canvas =
        document.getElementById(
            "powerConsumptionChart"
        );


    if (!canvas) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {
        return;
    }


    const monthlyData =
        Array(12).fill(0);


    meterData
        .filter(
            record =>
                record.meter === "Main Meter"
        )
        .forEach(
            record => {

                const date =
                    new Date(record.date);

                const month =
                    date.getMonth();

                monthlyData[month] +=
                    Number(
                        record.actualKwh
                    );
            }
        );


    if (powerConsumptionChart) {

        powerConsumptionChart.destroy();
    }


    powerConsumptionChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec"
                    ],

                    datasets: [

                        {
                            label:
                                "MSEB Consumption (kWh)",

                            data:
                                monthlyData,

                            borderWidth: 2,

                            tension: 0.3
                        }

                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false

                }
            }
        );
}


// =====================================================
// SOLAR VS MSEB CHART
// =====================================================

let solarMsebChart = null;


function createSolarChart() {

    const canvas =
        document.getElementById(
            "solarMsebChart"
        );


    if (!canvas) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {
        return;
    }


    if (solarMsebChart) {

        solarMsebChart.destroy();
    }


    solarMsebChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "MSEB",
                        "Solar"
                    ],

                    datasets: [

                        {
                            data: [
                                100,
                                0
                            ],

                            borderWidth: 1
                        }

                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false

                }
            }
        );
}


// =====================================================
// PAGE INITIALIZATION
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // Initially Dashboard show
        document.getElementById(
            "dashboardPage"
        ).style.display = "block";


        // Main Meter hide
        document.getElementById(
            "mainMeterPage"
        ).style.display = "none";


        // Form hide
        closeMeterForm();


        // Date & time
        setDefaultDateTime();


        // Dashboard
        updateDashboard();

        updateRecentData();

        updatePowerChart();

        createSolarChart();


        // Meter table
        displayMeterData();


        // Current month
        const monthElement =
            document.getElementById(
                "currentMonth"
            );


        if (monthElement) {

            monthElement.textContent =
                new Date().toLocaleDateString(
                    "en-IN",
                    {
                        month: "long",
                        year: "numeric"
                    }
                );
        }
    }
);