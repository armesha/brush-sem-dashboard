/* js/script.js */

document.addEventListener('DOMContentLoaded', () => {
    const page = document.querySelector('h1').innerText.toLowerCase();
    let dataFile = '';

    if (page.includes('production statistics')) {
        dataFile = 'data/production_stats.json';
        console.log('Loading Production Stats:', dataFile); // Debug message
        loadProductionStats();
    } else if (page.includes('equipment status')) {
        dataFile = 'data/equipment_status.json';
        loadEquipmentStatus();
    } else if (page.includes('maintenance')) {
        dataFile = 'data/maintenance.json';
        loadMaintenance();
    } else if (page.includes('dashboard') || page.includes('home')) {
        loadHomePageData();
    }

    function fetchData(file, callback) {
        fetch(file)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Data loaded:', data);
                callback(data);
            })
            .catch(error => {
                console.error('Fetch error:', error); // Show error in console
                const elementId = file.split('/')[1].split('.')[0];
                const element = document.getElementById(elementId);
                if (element) {
                    element.innerHTML = '<p>Error loading data.</p>';
                }
            });
    }

    // Home Page Functions
    function loadHomePageData() {
        Promise.all([
            fetchJson('data/production_stats.json'),
            fetchJson('data/equipment_status.json'),
            fetchJson('data/maintenance.json')
        ]).then(([productionData, equipmentData, maintenanceData]) => {
            // Calculate total production
            const totalProduction = productionData.daily.reduce((sum, item) => sum + Number(item.amount), 0);
            document.getElementById('total-production').innerText = `${totalProduction} units`;

            // Calculate equipment status counts
            const running = equipmentData.status.filter(item => item.state.toLowerCase() === 'running').length;
            const maintenance = equipmentData.status.filter(item => item.state.toLowerCase() === 'maintenance').length;
            document.getElementById('running-equipment').innerText = running;
            document.getElementById('maintenance-equipment').innerText = maintenance;

            // Upcoming maintenance count
            const upcomingMaintenance = maintenanceData.upcoming.length;
            document.getElementById('upcoming-maintenance').innerText = upcomingMaintenance;

            // Initialize overview charts
            initOverviewProductionChart(productionData.daily);
            initOverviewEquipmentChart(equipmentData.status);
        }).catch(error => {
            console.error('Error loading home page data:', error);
            document.getElementById('overview').innerHTML = '<p>Error loading overview data.</p>';
        });
    }

    function fetchJson(file) {
        return fetch(file)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${file}`);
                }
                return response.json();
            });
    }

    function initOverviewProductionChart(dailyData) {
        const ctx = document.getElementById('overviewProductionChart').getContext('2d');
        const labels = dailyData.map(item => item.date);
        const amounts = dailyData.map(item => item.amount);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Production',
                    data: amounts,
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        enabled: true
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Units Produced'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }

    function initOverviewEquipmentChart(statusData) {
        const ctx = document.getElementById('overviewEquipmentChart').getContext('2d');
        const statusCounts = statusData.reduce((acc, item) => {
            acc[item.state] = (acc[item.state] || 0) + 1;
            return acc;
        }, {});
        const labels = Object.keys(statusCounts);
        const data = Object.values(statusCounts);
        const backgroundColors = labels.map(state => {
            switch(state.toLowerCase()) {
                case 'running': return 'rgba(75, 192, 192, 0.6)';
                case 'maintenance': return 'rgba(255, 206, 86, 0.6)';
                case 'idle': return 'rgba(201, 203, 207, 0.6)';
                default: return 'rgba(153, 102, 255, 0.6)';
            }
        });

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Equipment Status',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: 'rgba(255, 255, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        enabled: true
                    }
                }
            }
        });
    }

    // Existing Page Functions (Production Stats, Equipment Status, Maintenance)
    function loadProductionStats() {
        fetchData(dataFile, (data) => {
            // Remove loading text
            const widget = document.getElementById('production-stats');
            widget.innerHTML = `
                <div class="chart-container">
                    <h2>Daily Production</h2>
                    <canvas id="dailyChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>Weekly Production</h2>
                    <canvas id="weeklyChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>Monthly Production</h2>
                    <canvas id="monthlyChart"></canvas>
                </div>
                <button id="downloadReport">Download Report</button>
            `;

            // Initialize charts
            initDailyChart(data.daily);
            const weeklyData = aggregateWeeklyData(data.daily);
            initWeeklyChart(weeklyData);
            const monthlyData = aggregateMonthlyData(data.daily);
            initMonthlyChart(monthlyData);

            // Add event listener for PDF download
            document.getElementById('downloadReport').addEventListener('click', () => {
                downloadPDFReport();
            });
        });
    }

    function initDailyChart(dailyData) {
        const ctx = document.getElementById('dailyChart').getContext('2d');
        const labels = dailyData.map(item => item.date);
        const amounts = dailyData.map(item => item.amount);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Production',
                    data: amounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    tooltip: {
                        enabled: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Units Produced'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }

    function initWeeklyChart(weeklyData) {
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        const labels = weeklyData.map(item => `Week ${item.week}`);
        const amounts = weeklyData.map(item => item.amount);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weekly Production',
                    data: amounts,
                    fill: false,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        enabled: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Units Produced'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Week'
                        }
                    }
                }
            }
        });
    }

    function initMonthlyChart(monthlyData) {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        const labels = monthlyData.map(item => item.month);
        const amounts = monthlyData.map(item => item.amount);

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Production',
                    data: amounts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        enabled: true
                    }
                }
            }
        });
    }

    function aggregateWeeklyData(dailyData) {
        const weeks = {};
        dailyData.forEach(item => {
            const date = new Date(item.date);
            const weekNumber = getWeekNumber(date);
            if (!weeks[weekNumber]) {
                weeks[weekNumber] = 0;
            }
            weeks[weekNumber] += item.amount;
        });
        const aggregated = [];
        for (const week in weeks) {
            aggregated.push({ week: week, amount: weeks[week] });
        }
        return aggregated;
    }

    function aggregateMonthlyData(dailyData) {
        const months = {};
        dailyData.forEach(item => {
            const date = new Date(item.date);
            const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!months[month]) {
                months[month] = 0;
            }
            months[month] += item.amount;
        });
        const aggregated = [];
        for (const month in months) {
            aggregated.push({ month: month, amount: months[month] });
        }
        return aggregated;
    }

    function getWeekNumber(d) {
        // Copy date so don't modify original
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        // Set to nearest Thursday: current date + 4 - current day number
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        // Get first day of year
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        // Calculate full weeks to nearest Thursday
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
        return weekNo;
    }

    function downloadPDFReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Production Report', 14, 22);

        // Add Daily Chart
        const dailyCanvas = document.getElementById('dailyChart');
        const dailyImg = dailyCanvas.toDataURL('image/png', 1.0);
        doc.setFontSize(14);
        doc.text('Daily Production', 14, 30);
        doc.addImage(dailyImg, 'PNG', 14, 35, 180, 60);

        // Add Weekly Chart
        const weeklyCanvas = document.getElementById('weeklyChart');
        const weeklyImg = weeklyCanvas.toDataURL('image/png', 1.0);
        doc.text('Weekly Production', 14, 105);
        doc.addImage(weeklyImg, 'PNG', 14, 110, 180, 60);

        // Add Monthly Chart
        const monthlyCanvas = document.getElementById('monthlyChart');
        const monthlyImg = monthlyCanvas.toDataURL('image/png', 1.0);
        doc.text('Monthly Production', 14, 185);
        doc.addImage(monthlyImg, 'PNG', 14, 190, 180, 60);

        doc.save('production_report.pdf');
    }

    function loadEquipmentStatus() {
        fetchData(dataFile, (data) => {
            // Remove loading text
            const widget = document.getElementById('equipment-status');
            widget.innerHTML = `
                <h2>Current Status</h2>
                <canvas id="equipmentStatusChart"></canvas>
                <input type="text" id="equipmentSearch" placeholder="Search Equipment...">
                <table id="equipmentTable">
                    <thead>
                        <tr>
                            <th>Equipment</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.status.map(item => `
                            <tr>
                                <td>${item.equipment}</td>
                                <td>${item.state}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            // Initialize chart
            initEquipmentStatusChart(data.status);

            // Add search functionality
            document.getElementById('equipmentSearch').addEventListener('input', function() {
                const filter = this.value.toLowerCase();
                const rows = document.querySelectorAll('#equipmentTable tbody tr');
                rows.forEach(row => {
                    const equipment = row.cells[0].innerText.toLowerCase();
                    if (equipment.includes(filter)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        });
    }

    function initEquipmentStatusChart(statusData) {
        const ctx = document.getElementById('equipmentStatusChart').getContext('2d');
        const statusCounts = statusData.reduce((acc, item) => {
            acc[item.state] = (acc[item.state] || 0) + 1;
            return acc;
        }, {});
        const labels = Object.keys(statusCounts);
        const data = Object.values(statusCounts);
        const backgroundColors = labels.map(state => {
            switch(state.toLowerCase()) {
                case 'running': return 'rgba(75, 192, 192, 0.6)';
                case 'maintenance': return 'rgba(255, 206, 86, 0.6)';
                case 'idle': return 'rgba(201, 203, 207, 0.6)';
                default: return 'rgba(153, 102, 255, 0.6)';
            }
        });

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Equipment Status',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: 'rgba(255, 255, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        enabled: true
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    function loadMaintenance() {
        fetchData(dataFile, (data) => {
            // Remove loading text
            const widget = document.getElementById('maintenance');
            widget.innerHTML = `
                <h2>Upcoming Maintenance</h2>
                <canvas id="maintenanceChart"></canvas>
                <div id="maintenanceCalendar"></div>
            `;

            // Initialize maintenance chart
            initMaintenanceChart(data.upcoming);

            // Initialize maintenance calendar
            initMaintenanceCalendar(data.upcoming);
        });
    }

    function initMaintenanceChart(upcomingData) {
        const ctx = document.getElementById('maintenanceChart').getContext('2d');
        const weekCounts = {};

        upcomingData.forEach(item => {
            const date = new Date(item.date);
            const weekNumber = getWeekNumber(date);
            if (!weekCounts[weekNumber]) {
                weekCounts[weekNumber] = 0;
            }
            weekCounts[weekNumber]++;
        });

        const labels = Object.keys(weekCounts).map(week => `Week ${week}`);
        const data = Object.values(weekCounts);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Upcoming Maintenance Tasks',
                    data: data,
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        enabled: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Tasks'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Week'
                        }
                    }
                }
            }
        });
    }

    function initMaintenanceCalendar(upcomingData) {
        const calendarDiv = document.getElementById('maintenanceCalendar');
        const events = upcomingData.map(item => ({
            title: item.equipment,
            date: item.date
        }));

        // Simple Calendar Implementation
        let calendarHTML = '<h3>Maintenance Calendar</h3><ul>';
        events.forEach(event => {
            calendarHTML += `<li>${event.date}: ${event.title}</li>`;
        });
        calendarHTML += '</ul>';
        calendarDiv.innerHTML = calendarHTML;
    }
});
