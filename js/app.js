// Contract Configuration
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const contractABI = [
    // Contract ABI from contract-config.js
];

// Web3 and Contract Integration
let web3;
let contract;
let userAccount;
let isAdmin = false;

// Show MetaMask Installation Banner
function showMetaMaskBanner() {
    const banner = document.createElement('div');
    banner.className = 'fixed top-0 left-0 right-0 bg-red-500 text-white p-4';
    banner.style.zIndex = '1000';
    banner.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div class="flex items-center">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span>MetaMask is required to use this DApp</span>
            </div>
            <a href="https://metamask.io/download.html" 
               target="_blank"
               class="bg-white text-red-500 px-4 py-2 rounded-md hover:bg-red-50 transition-colors">
                Install MetaMask
            </a>
        </div>
    `;
    document.body.prepend(banner);
}

// Check if MetaMask is installed
function isMetaMaskInstalled() {
    return Boolean(window.ethereum && window.ethereum.isMetaMask);
}

// Check if connected to the correct network (localhost:8545)
async function checkNetwork() {
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        // Hardhat local network chainId is 31337 (hex: 0x7a69)
        if (chainId !== '0x7a69') {
            showNotification('Please connect to Hardhat Local Network (http://localhost:8545)', 'error');
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking network:', error);
        return false;
    }
}

// Initialize Web3
async function initWeb3() {
    if (!isMetaMaskInstalled()) {
        showMetaMaskBanner();
        return false;
    }

    try {
        web3 = new Web3(window.ethereum);
        return true;
    } catch (error) {
        console.error('Error initializing Web3:', error);
        return false;
    }
}

// Connect to MetaMask
async function connectWallet() {
    if (!isMetaMaskInstalled()) {
        showNotification('Please install MetaMask to use this DApp!', 'error');
        return false;
    }

    try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];

        // Check network
        if (!await checkNetwork()) {
            return false;
        }
        
        // Update UI
        const connectButton = document.getElementById('connectWallet');
        connectButton.innerHTML = `
            <div class="flex items-center">
                <img src="https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg" 
                     class="w-4 h-4 mr-2" alt="MetaMask">
                <span>${userAccount.substring(0, 6)}...${userAccount.substring(38)}</span>
            </div>
        `;
        connectButton.classList.remove('bg-indigo-600');
        connectButton.classList.add('bg-green-600');

        // Initialize Contract
        contract = new web3.eth.Contract(contractABI, contractAddress);

        // Check if user is admin
        const admin = await contract.methods.admin().call();
        isAdmin = userAccount.toLowerCase() === admin.toLowerCase();
        
        // Show/hide admin features
        toggleAdminFeatures();

        // Load user's lands
        await loadUserLands();

        // Listen for account changes
        window.ethereum.on('accountsChanged', function (accounts) {
            window.location.reload();
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', function (networkId) {
            window.location.reload();
        });

        return true;
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        if (error.code === 4001) {
            showNotification('Please connect your MetaMask wallet', 'error');
        } else {
            showNotification('Failed to connect to MetaMask. Please try again.', 'error');
        }
        return false;
    }
}

// Toggle Admin Features
function toggleAdminFeatures() {
    const adminSection = document.getElementById('adminSection');
    if (adminSection) {
        adminSection.style.display = isAdmin ? 'block' : 'none';
    }
}

// Load User's Lands
async function loadUserLands() {
    try {
        const lands = await contract.methods.getOwnerLands(userAccount).call();
        const landsContainer = document.getElementById('userLands');
        
        if (!landsContainer) return;
        
        landsContainer.innerHTML = '';
        
        if (lands.length === 0) {
            landsContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-home text-gray-400 text-4xl mb-4"></i>
                    <p class="text-gray-500">You don't own any lands yet.</p>
                    <p class="text-gray-500 text-sm">Use the registration form below to register your first land.</p>
                </div>
            `;
            return;
        }
        
        for (const landId of lands) {
            const landDetails = await contract.methods.getLandDetails(landId).call();
            const landHistory = await contract.methods.getLandTransferHistory(landId).call();
            
            const landCard = createLandCard(landId, landDetails, landHistory);
            landsContainer.appendChild(landCard);
        }
    } catch (error) {
        console.error('Error loading lands:', error);
        showNotification('Failed to load lands', 'error');
    }
}

// Create Land Card UI
function createLandCard(landId, details, history) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-md p-6 mb-4 transform transition-transform hover:scale-[1.02]';
    
    const verificationStatus = details.isVerified 
        ? '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>Verified</span>' 
        : '<span class="text-red-600"><i class="fas fa-clock mr-1"></i>Pending Verification</span>';

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h3 class="text-xl font-semibold mb-2">Land #${landId}</h3>
                <p class="text-gray-600"><i class="fas fa-user mr-1"></i>Owner: ${details.ownerName}</p>
                <p class="text-gray-600"><i class="fas fa-map-marker-alt mr-1"></i>Location: ${details.location}</p>
                <p class="text-gray-600"><i class="fas fa-ruler-combined mr-1"></i>Area: ${details.area} sq ft</p>
                <p class="text-gray-600"><i class="fas fa-coins mr-1"></i>Value: ${web3.utils.fromWei(details.value, 'ether')} ETH</p>
                <p class="text-gray-600"><i class="fas fa-info-circle mr-1"></i>Status: ${verificationStatus}</p>
            </div>
            <div class="space-y-2">
                ${details.isVerified ? `
                    <button onclick="showTransferModal(${landId})" 
                            class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors">
                        <i class="fas fa-exchange-alt mr-1"></i>Transfer
                    </button>
                ` : ''}
                <button onclick="showHistoryModal(${landId})"
                        class="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300 transition-colors">
                    <i class="fas fa-history mr-1"></i>History
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Handle Land Registration
async function registerLand(event) {
    event.preventDefault();
    
    if (!isMetaMaskInstalled()) {
        showNotification('Please install MetaMask to use this feature!', 'error');
        return;
    }

    if (!userAccount) {
        showNotification('Please connect your wallet first!', 'error');
        return;
    }

    const form = event.target;
    const landData = {
        ownerName: form.querySelector('input[name="ownerName"]').value,
        area: form.querySelector('input[name="area"]').value,
        location: form.querySelector('input[name="location"]').value,
        value: web3.utils.toWei(form.querySelector('input[name="value"]').value, 'ether'),
        description: form.querySelector('textarea[name="description"]').value
    };

    try {
        showNotification('Processing transaction...', 'info');
        
        const result = await contract.methods.registerLand(
            landData.ownerName,
            landData.area,
            landData.location,
            landData.value,
            landData.description
        ).send({ from: userAccount });

        showNotification('Land registered successfully!', 'success');
        form.reset();
        
        // Reload user's lands
        await loadUserLands();
        
        console.log('Transaction hash:', result.transactionHash);
    } catch (error) {
        console.error('Error registering land:', error);
        if (error.code === 4001) {
            showNotification('Transaction was cancelled', 'error');
        } else {
            showNotification('Failed to register land. Please try again.', 'error');
        }
    }
}

// Handle Land Transfer
async function transferLand(landId, newOwner, newValue) {
    if (!isMetaMaskInstalled()) {
        showNotification('Please install MetaMask to use this feature!', 'error');
        return;
    }

    try {
        showNotification('Processing transfer...', 'info');
        
        const valueInWei = web3.utils.toWei(newValue.toString(), 'ether');
        await contract.methods.transferLand(landId, newOwner, valueInWei)
            .send({ from: userAccount });
        
        showNotification('Land transferred successfully!', 'success');
        closeTransferModal();
        await loadUserLands();
    } catch (error) {
        console.error('Error transferring land:', error);
        if (error.code === 4001) {
            showNotification('Transfer was cancelled', 'error');
        } else {
            showNotification('Failed to transfer land. Please try again.', 'error');
        }
    }
}

// Admin Functions
async function addVerifier(address) {
    if (!isMetaMaskInstalled()) {
        showNotification('Please install MetaMask to use this feature!', 'error');
        return;
    }

    if (!isAdmin) {
        showNotification('Only admin can add verifiers', 'error');
        return;
    }

    try {
        await contract.methods.addVerifier(address)
            .send({ from: userAccount });
        showNotification('Verifier added successfully!', 'success');
    } catch (error) {
        console.error('Error adding verifier:', error);
        if (error.code === 4001) {
            showNotification('Transaction was cancelled', 'error');
        } else {
            showNotification('Failed to add verifier', 'error');
        }
    }
}

// Modal Functions
function showTransferModal(landId) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center';
    modal.id = 'transferModal';
    
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg w-96">
            <h3 class="text-xl font-semibold mb-4">Transfer Land #${landId}</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">New Owner Address</label>
                    <input type="text" id="newOwner" class="w-full px-4 py-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">New Value (ETH)</label>
                    <input type="number" id="newValue" step="0.01" class="w-full px-4 py-2 border rounded-md">
                </div>
                <div class="flex justify-end space-x-4">
                    <button onclick="closeTransferModal()" 
                            class="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                    <button onclick="confirmTransfer(${landId})"
                            class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                        Transfer
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeTransferModal() {
    const modal = document.getElementById('transferModal');
    if (modal) modal.remove();
}

function confirmTransfer(landId) {
    const newOwner = document.getElementById('newOwner').value;
    const newValue = document.getElementById('newValue').value;
    
    if (!web3.utils.isAddress(newOwner)) {
        showNotification('Invalid address', 'error');
        return;
    }
    
    if (!newValue || newValue <= 0) {
        showNotification('Invalid value', 'error');
        return;
    }
    
    transferLand(landId, newOwner, newValue);
}

function showHistoryModal(landId) {
    contract.methods.getLandTransferHistory(landId).call()
        .then(history => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center';
            modal.id = 'historyModal';
            
            let historyHTML = history.map(transfer => `
                <div class="border-b border-gray-200 py-3">
                    <p class="text-sm">
                        <span class="font-medium">From:</span> ${transfer.from}<br>
                        <span class="font-medium">To:</span> ${transfer.to}<br>
                        <span class="font-medium">Value:</span> ${web3.utils.fromWei(transfer.value, 'ether')} ETH<br>
                        <span class="font-medium">Date:</span> ${new Date(transfer.timestamp * 1000).toLocaleString()}
                    </p>
                </div>
            `).join('');
            
            if (history.length === 0) {
                historyHTML = '<p class="text-gray-500">No transfer history available</p>';
            }
            
            modal.innerHTML = `
                <div class="bg-white p-6 rounded-lg w-96 max-h-[80vh] overflow-y-auto">
                    <h3 class="text-xl font-semibold mb-4">Transfer History - Land #${landId}</h3>
                    <div class="space-y-2">
                        ${historyHTML}
                    </div>
                    <div class="mt-4 flex justify-end">
                        <button onclick="closeHistoryModal()" 
                                class="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                            Close
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        })
        .catch(error => {
            console.error('Error fetching history:', error);
            showNotification('Failed to load transfer history', 'error');
        });
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.remove();
}

// Notification System
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white ${
        type === 'error' ? 'bg-red-500' :
        type === 'success' ? 'bg-green-500' :
        'bg-blue-500'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${
                type === 'error' ? 'exclamation-circle' :
                type === 'success' ? 'check-circle' :
                'info-circle'
            } mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize DApp
async function initDApp() {
    if (await initWeb3()) {
        // Check if wallet is already connected
        if (typeof window.ethereum !== 'undefined' && window.ethereum.selectedAddress) {
            await connectWallet();
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DApp
    initDApp();

    // Connect wallet button
    const connectWalletBtn = document.getElementById('connectWallet');
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }

    // Land registration form
    const registrationForm = document.getElementById('landRegistrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', registerLand);
    }

    // Admin form
    const addVerifierForm = document.getElementById('addVerifierForm');
    if (addVerifierForm) {
        addVerifierForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const address = e.target.verifierAddress.value;
            addVerifier(address);
            e.target.reset();
        });
    }
});

// Make functions globally accessible
window.showTransferModal = showTransferModal;
window.closeTransferModal = closeTransferModal;
window.confirmTransfer = confirmTransfer;
window.showHistoryModal = showHistoryModal;
window.closeHistoryModal = closeHistoryModal;
