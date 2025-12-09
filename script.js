// Host Finder - Frontend JavaScript
// API Configuration
const API_URL = 'https://host-finder.adamlebowski.workers.dev/api/find-hosts';

// State
let currentResults = [];

// DOM Elements
const searchBtn = document.getElementById('searchBtn');
const topicInput = document.getElementById('topic');
const numLeadsInput = document.getElementById('numLeads');
const platformCheckboxes = document.querySelectorAll('input[name="platform"]');
const filtersToggle = document.getElementById('filtersToggle');
const filtersContent = document.getElementById('filtersContent');
const loadingState = document.getElementById('loadingState');
const resultsSection = document.getElementById('resultsSection');
const resultsList = document.getElementById('resultsList');
const resultsCount = document.getElementById('resultsCount');
const exportBtn = document.getElementById('exportBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
});

function setupEventListeners() {
  // Search button
  searchBtn.addEventListener('click', handleSearch);
  
  // Enter key in topic input
  topicInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  
  // Filters toggle
  filtersToggle.addEventListener('click', toggleFilters);
  
  // Export button
  exportBtn.addEventListener('click', exportResults);
}

function toggleFilters() {
  filtersToggle.classList.toggle('active');
  filtersContent.classList.toggle('active');
}

// Handle search
async function handleSearch() {
  const topic = topicInput.value.trim();
  const numLeads = parseInt(numLeadsInput.value);
  
  // Validation
  if (!topic) {
    alert('Please enter a topic or community');
    return;
  }
  
  const selectedPlatforms = Array.from(platformCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  
  if (selectedPlatforms.length === 0) {
    alert('Please select at least one platform');
    return;
  }
  
  // Collect filters
  const filters = {
    reddit: {
      minKarma: parseInt(document.getElementById('reddit-karma').value),
      minComments: parseInt(document.getElementById('reddit-comments').value),
      moderatorsOnly: document.getElementById('reddit-mods').checked
    },
    twitter: {
      minFollowers: parseInt(document.getElementById('twitter-followers').value),
      minEngagementRate: parseFloat(document.getElementById('twitter-engagement').value)
    },
    instagram: {
      minFollowers: parseInt(document.getElementById('instagram-followers').value),
      verifiedOnly: document.getElementById('instagram-verified').checked
    },
    tiktok: {
      minFollowers: parseInt(document.getElementById('tiktok-followers').value),
      minLikes: parseInt(document.getElementById('tiktok-likes').value)
    },
    linkedin: {
      minConnections: parseInt(document.getElementById('linkedin-connections').value)
    }
  };
  
  // Prepare request
  const requestData = {
    topic,
    numLeads,
    platforms: selectedPlatforms,
    filters
  };
  
  // Show loading state
  document.getElementById('searchSection').style.display = 'none';
  resultsSection.classList.remove('active');
  loadingState.classList.add('active');
  searchBtn.disabled = true;
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.results) {
      throw new Error(data.error || 'No results returned');
    }
    
    // Store and display results
    currentResults = data.results.map(r => ({ ...r, kept: true }));
    displayResults(currentResults);
    
  } catch (error) {
    console.error('Search error:', error);
    alert(`Search failed: ${error.message}\n\nPlease check your Cloudflare Worker configuration and API keys.`);
    document.getElementById('searchSection').style.display = 'block';
  } finally {
    loadingState.classList.remove('active');
    searchBtn.disabled = false;
  }
}

// Display results
function displayResults(results) {
  if (results.length === 0) {
    resultsList.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); padding: 2rem;">No results found</p>';
    resultsSection.classList.add('active');
    return;
  }
  
  resultsCount.textContent = results.length;
  
  resultsList.innerHTML = results.map((result, index) => {
    const scoreClass = result.score >= 70 ? 'high' : result.score >= 50 ? 'medium' : 'low';
    const platformIcon = getPlatformIcon(result.platform);
    
    return `
      <div class="result-card ${result.kept ? '' : 'removed'}" style="--index: ${index}" data-index="${index}">
        <div class="result-header">
          <div class="result-main">
            <div class="result-top">
              <div class="score-badge ${scoreClass}">${result.score}</div>
              <div class="platform-badge">
                <span>${platformIcon}</span>
                <span>${result.platform}</span>
              </div>
            </div>
            <h3 class="username">${escapeHtml(result.username)}</h3>
            <p class="source">${escapeHtml(result.source)}</p>
          </div>
          <div class="result-actions">
            <button class="action-btn keep ${result.kept ? 'active' : ''}" onclick="toggleKeep(${index}, true)">
              ✓ Keep
            </button>
            <button class="action-btn remove ${!result.kept ? 'active' : ''}" onclick="toggleKeep(${index}, false)">
              ✕ Remove
            </button>
            <a href="${escapeHtml(result.profileUrl)}" target="_blank" class="profile-link">
              View Profile →
            </a>
          </div>
        </div>
        <p class="reasoning">${escapeHtml(result.reasoning)}</p>
        <div class="stats-row">
          ${formatStats(result)}
        </div>
      </div>
    `;
  }).join('');
  
  resultsSection.classList.add('active');
  
  // Smooth scroll to results
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Toggle keep/remove status
function toggleKeep(index, keep) {
  currentResults[index].kept = keep;
  
  const card = document.querySelector(`[data-index="${index}"]`);
  if (card) {
    if (keep) {
      card.classList.remove('removed');
    } else {
      card.classList.add('removed');
    }
    
    // Update buttons
    const keepBtn = card.querySelector('.action-btn.keep');
    const removeBtn = card.querySelector('.action-btn.remove');
    
    if (keep) {
      keepBtn.classList.add('active');
      removeBtn.classList.remove('active');
    } else {
      keepBtn.classList.remove('active');
      removeBtn.classList.add('active');
    }
  }
}

// Format stats based on platform
function formatStats(result) {
  const stats = result.stats || {};
  const items = [];
  
  if (stats.karma !== undefined) {
    items.push(`<div class="stat-item"><span class="stat-label">Karma:</span> ${formatNumber(stats.karma)}</div>`);
  }
  if (stats.comments !== undefined) {
    items.push(`<div class="stat-item"><span class="stat-label">Comments:</span> ${formatNumber(stats.comments)}</div>`);
  }
  if (stats.followers !== undefined) {
    items.push(`<div class="stat-item"><span class="stat-label">Followers:</span> ${formatNumber(stats.followers)}</div>`);
  }
  if (stats.engagement !== undefined) {
    items.push(`<div class="stat-item"><span class="stat-label">Engagement:</span> ${stats.engagement}%</div>`);
  }
  if (stats.likes !== undefined) {
    items.push(`<div class="stat-item"><span class="stat-label">Likes:</span> ${formatNumber(stats.likes)}</div>`);
  }
  if (stats.connections !== undefined) {
    items.push(`<div class="stat-item"><span class="stat-label">Connections:</span> ${formatNumber(stats.connections)}</div>`);
  }
  
  return items.join('');
}

// Get platform icon
function getPlatformIcon(platform) {
  const icons = {
    reddit: '🔴',
    twitter: '🐦',
    instagram: '📸',
    tiktok: '🎵',
    linkedin: '💼'
  };
  return icons[platform] || '📱';
}

// Export results to CSV
function exportResults() {
  const keptResults = currentResults.filter(r => r.kept);
  
  if (keptResults.length === 0) {
    alert('No results selected for export');
    return;
  }
  
  // Build CSV
  const headers = ['Score', 'Platform', 'Username', 'Source', 'Reasoning', 'Profile URL'];
  const statsHeaders = getStatsHeaders(keptResults);
  const allHeaders = [...headers, ...statsHeaders];
  
  const rows = keptResults.map(result => {
    const baseRow = [
      result.score,
      result.platform,
      result.username,
      result.source,
      result.reasoning,
      result.profileUrl
    ];
    
    const statsRow = statsHeaders.map(header => {
      const key = header.toLowerCase().replace(/\s+/g, '');
      return result.stats?.[key] || '';
    });
    
    return [...baseRow, ...statsRow];
  });
  
  const csv = [
    allHeaders.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `host-finder-results-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Get unique stats headers from results
function getStatsHeaders(results) {
  const headersSet = new Set();
  results.forEach(r => {
    if (r.stats) {
      Object.keys(r.stats).forEach(key => {
        headersSet.add(key.charAt(0).toUpperCase() + key.slice(1));
      });
    }
  });
  return Array.from(headersSet);
}

// Utility: Format numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make toggleKeep available globally
window.toggleKeep = toggleKeep;
