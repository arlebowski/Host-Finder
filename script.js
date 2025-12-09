// Host Finder Frontend
// Replace with your actual Worker URL after deployment
const API_URL = 'https://host-finder-api.YOUR-SUBDOMAIN.workers.dev';

let currentResults = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupCheckboxes();
  setupForm();
  setupExport();
});

// Handle source checkbox styling
function setupCheckboxes() {
  document.querySelectorAll('.source-checkbox').forEach(label => {
    const checkbox = label.querySelector('input[type="checkbox"]');
    
    label.addEventListener('click', (e) => {
      if (e.target === checkbox) return; // Let checkbox handle itself
      
      checkbox.checked = !checkbox.checked;
      updateCheckboxStyle(label, checkbox.checked);
    });
    
    checkbox.addEventListener('change', (e) => {
      updateCheckboxStyle(label, e.target.checked);
    });
  });
}

function updateCheckboxStyle(label, checked) {
  if (checked) {
    label.classList.add('checked');
  } else {
    label.classList.remove('checked');
  }
}

// Handle form submission
function setupForm() {
  const form = document.getElementById('searchForm');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const topic = document.getElementById('topic').value.trim();
    const count = parseInt(document.getElementById('count').value);
    const sources = Array.from(document.querySelectorAll('input[name="source"]:checked'))
      .map(cb => cb.value);
    
    if (!topic) {
      showStatus('error', 'Please enter a topic');
      return;
    }
    
    if (sources.length === 0) {
      showStatus('error', 'Please select at least one data source');
      return;
    }
    
    await findHosts(topic, count, sources);
  });
}

// Main API call
async function findHosts(topic, count, sources) {
  const statusDiv = document.getElementById('status');
  const resultsDiv = document.getElementById('results');
  const submitBtn = document.getElementById('submitBtn');
  
  // Show loading state
  showStatus('loading', `Searching ${sources.join(', ')}... This may take 2-3 minutes.`);
  submitBtn.disabled = true;
  resultsDiv.classList.remove('show');
  
  try {
    const response = await fetch(`${API_URL}/api/find-hosts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        count,
        sources
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.details || 'Failed to find hosts');
    }
    
    // Show success
    showStatus('success', `Found ${data.count} potential hosts!`);
    
    // Display results
    currentResults = data.users;
    displayResults(data.users);
    resultsDiv.classList.add('show');
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
  } catch (error) {
    console.error('Error:', error);
    showStatus('error', `Error: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
  }
}

// Display results in table
function displayResults(users) {
  const tbody = document.getElementById('resultsBody');
  const countSpan = document.getElementById('resultCount');
  
  tbody.innerHTML = '';
  countSpan.textContent = users.length;
  
  users.forEach(user => {
    const tr = document.createElement('tr');
    
    const scoreClass = user.host_score >= 70 ? 'high' : 
                      user.host_score >= 40 ? 'medium' : 'low';
    const platformClass = `platform-${user.platform.toLowerCase()}`;
    
    tr.innerHTML = `
      <td><span class="score ${scoreClass}">${user.host_score}</span></td>
      <td><span class="platform-badge ${platformClass}">${user.platform}</span></td>
      <td class="username"><a href="${user.profile_url}" target="_blank" rel="noopener">${escapeHtml(user.username)}</a></td>
      <td>${escapeHtml(user.source)}</td>
      <td class="reasoning">${escapeHtml(user.reasoning)}</td>
    `;
    
    tbody.appendChild(tr);
  });
}

// Setup export to CSV
function setupExport() {
  const exportBtn = document.getElementById('exportBtn');
  exportBtn.addEventListener('click', exportToCSV);
}

function exportToCSV() {
  if (currentResults.length === 0) {
    alert('No results to export');
    return;
  }
  
  const headers = ['Score', 'Platform', 'Username', 'Source', 'Reasoning', 'Profile URL', 'Email'];
  const rows = currentResults.map(user => [
    user.host_score,
    user.platform,
    user.username,
    user.source,
    user.reasoning,
    user.profile_url,
    user.email || ''
  ]);
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
  });
  
  // Create download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `host-finder-results-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// Show status message
function showStatus(type, message) {
  const statusDiv = document.getElementById('status');
  statusDiv.className = `status ${type}`;
  statusDiv.textContent = message;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
