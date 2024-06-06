document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('selectionForm');
    const plotOption = document.getElementById('plotOption');
    const chartDiv = document.getElementById('chart');
    const tableBody = document.querySelector('#dataTable tbody');
    const valueColumn = document.getElementById('valueColumn');

    // Load data
    let countryData;
    fetch('data/countries.json')
        .then(response => response.json())
        .then(data => {
            countryData = data;
            updateChartAndTable('population');
        });

    // Form submission handler
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const selectedOption = plotOption.value;
        updateChartAndTable(selectedOption);
    });

    // Update chart and table based on selected option
    function updateChartAndTable(option) {
        const processedData = processData(option);
        updateChart(processedData, option);
        updateTable(processedData, option);
    }

    // Process data based on selected option
    function processData(option) {
        let data = [];
        if (option.startsWith('region')) {
            const regions = {};
            countryData.forEach(country => {
                if (!regions[country.region]) {
                    regions[country.region] = { countries: 0, timezones: new Set(), population: 0 };
                }
                regions[country.region].countries += 1;
                regions[country.region].population += country.population;
                country.timezones.forEach(tz => regions[country.region].timezones.add(tz));
            });
            data = Object.keys(regions).map(region => {
                let value;
                if (option === 'regionCountries') {
                    value = regions[region].countries;
                } else if (option === 'regionTimezones') {
                    value = regions[region].timezones.size;
                }
                return {
                    name: region,
                    value: value,
                    info: {
                        countries: regions[region].countries,
                        population: regions[region].population,
                        timezones: regions[region].timezones.size
                    }
                };
            });
        } else {
            data = countryData.map(country => {
                let value = 0;
                if (option === 'population') value = country.population;
                else if (option === 'borders') value = country.borders.length;
                else if (option === 'timezones') value = country.timezones.length;
                else if (option === 'languages') value = country.languages.length;
                return {
                    name: country.name,
                    value: value,
                    info: country
                };
            });
        }
        return data;
    }

    // Update chart using D3.js
    function updateChart(data, option) {
        d3.select(chartDiv).selectAll('*').remove();

        const width = chartDiv.clientWidth;
        const height = chartDiv.clientHeight;

        const svg = d3.select(chartDiv).append('svg')
            .attr('width', width)
            .attr('height', height);

        const bubbleSize = d3.scaleSqrt()
            .range([10, 60]) 
            .domain([0, d3.max(data, d => d.value)]);

        const simulation = d3.forceSimulation(data)
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('charge', d3.forceManyBody().strength(450)) 
            .force('x', d3.forceX().strength(0.2).x(width / 2))
            .force('y', d3.forceY().strength(0.2).y(height / 2))
            .force('collision', d3.forceCollide().radius(d => bubbleSize(d.value) + 10).strength(1)) 
            .on('tick', ticked);

        function ticked() {
            const bubbles = svg.selectAll('.bubble')
                .data(data)
                .enter().append('g')
                .attr('class', 'bubble')
                .attr('transform', d => `translate(${d.x},${d.y})`)
                .on('mouseover', function(event, d) {
                    d3.select(this).select('circle').attr('fill', 'orange');
                    showTooltip(event, d, option);
                })
                .on('mouseout', function(event, d) {
                    d3.select(this).select('circle').attr('fill', 'steelblue');
                    hideTooltip();
                });
            
            bubbles.append('circle')
                .attr('r', d => bubbleSize(d.value))
                .attr('fill', 'steelblue');
            
            bubbles.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '-0.3em')
                .text(d => d.name)
                .attr('font-size', d => Math.min(12, bubbleSize(d.value) / 3)) 
                .attr('fill', 'white');
            
            bubbles.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '1.0em')
                .text(d => d.value)
                .attr('font-size', d => Math.min(12, bubbleSize(d.value) / 3)) 
                .attr('fill', 'white');
        }
    }

    // Update table
    function updateTable(data, option) {
        tableBody.innerHTML = '';
        valueColumn.textContent = option.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); 
        data.forEach(item => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            nameCell.textContent = item.name;
            const valueCell = document.createElement('td');
            valueCell.textContent = item.value;
            row.appendChild(nameCell);
            row.appendChild(valueCell);
            tableBody.appendChild(row);
        });
    }

    // Tooltip functionality
    function showTooltip(event, data, option) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        if (option.startsWith('region')) {
            tooltip.innerHTML = `
                <strong>${data.name}</strong><br>
                Countries: ${data.info.countries}<br>
                Timezones: ${data.info.timezones}<br>
                Population: ${data.info.population}
            `;
        } else {
            tooltip.innerHTML = `
                <strong>${data.name}</strong><br>
                Population: ${data.info.population}<br>
                Borders: ${data.info.borders.length}<br>
                Timezones: ${data.info.timezones.length}<br>
                Languages: ${data.info.languages.length}
            `;
        }
        document.body.appendChild(tooltip);
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
    }

    function hideTooltip() {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    // Ensure the chart resizes with the window
    window.addEventListener('resize', () => {
        if (countryData) {
            const selectedOption = plotOption.value;
            updateChartAndTable(selectedOption);
        }
    });
});
