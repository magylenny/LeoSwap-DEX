
Moralis.initialize("xaSPYZZjSrBzMTFG7EFg7xWuc3UflPeoYhEwiXt8"); // Application id from moralis.io
Moralis.serverURL = "https://mvegkbktedyq.grandmoralis.com:2053/server"; //Server url from moralis.io
const defaultFromAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const defaultToAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";

let currentTrade = {

}
let currentSelectSide;
let tokens = [];


async function init() {
    await Moralis.initPlugins();
    await listAvailableTokens();
    listDefaultTokens();

    await Moralis.enable();


    currentUser = Moralis.User.current();
    if (currentUser) {
        document.getElementById("swap_button").disabled = false;
    }
}
async function listAvailableTokens() {
    const result = await Moralis.Plugins.oneInch.getSupportedTokens({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
    });
    tokens = result.tokens;
    let parent = document.getElementById("token_list");

    for (const address in tokens) {
        let token = tokens[address];
        let div = document.createElement("div");
        div.className = "token_row";
        let html = `
        <img class="token_list_img" src="${token.logoURI}">
        <span class="token_list_text">${token.symbol}</span>
        `
        div.innerHTML = html;
        div.onclick = () => {
            selectToken(address)
        };
        parent.appendChild(div);
    }

}
function listDefaultTokens() {
    currentTrade["from"] = tokens[defaultFromAddress];
    currentTrade["to"] = tokens[defaultToAddress];
    renderInterface();
}

function filterList() {
    let expression = document.getElementById("search-box").value;
    //first remove elements from tokens list
    let parent = document.getElementById("token_list");
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild)
    }
    for (const address in tokens) {
        let token = tokens[address];
        if (token.symbol.toLowerCase().includes(expression.toLowerCase())) {
            let div = document.createElement("div");
            div.className = "token_row";
            let html = `
        <img class="token_list_img" src="${token.logoURI}">
        <span class="token_list_text">${token.symbol}</span>
        `
            div.innerHTML = html;
            div.onclick = () => {
                selectToken(address)
            };
            parent.appendChild(div);
        }
    }
}

async function selectToken(address) {
    closeModal();
    currentTrade[currentSelectSide] = tokens[address];
    renderInterface();
    getQuote();
}
async function login() {
    try {
        currentUser = Moralis.User.current();
        if (!currentUser) {
            currentUser = await Moralis.Web3.authenticate();
        }
        document.getElementById("swap_button").disabled = false;
    } catch (error) {
        console.log(error);
    }
}

function renderInterface() {
    if (currentTrade.from) {
        document.getElementById("from_token_img").src = currentTrade.from.logoURI;
        document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
    }
    if (currentTrade.to) {
        document.getElementById("to_token_img").src = currentTrade.to.logoURI;
        document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
    }
}
const openModal = (side) => {
    currentSelectSide = side;
    document.getElementById("token_modal").style.display = "block"
}
const closeModal = () => {
    document.getElementById("token_modal").style.display = "none"
}

async function getQuote(event) {
    let amount;
    let source = event.target;

    if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) {
        return;
    };
    if (source === document.getElementById("from_amount")) {
        amount = Number(
            document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals
        );
        const quote = await Moralis.Plugins.oneInch.quote({
            chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
            fromTokenAddress: currentTrade.from.address, // The token you want to swap
            toTokenAddress: currentTrade.to.address, // The token you want to receive
            amount: amount,
        });
        console.log(quote);
        document.getElementById("gas_estimate").innerHTML = quote.estimatedGas;
        document.getElementById("to_amount").value = quote.toTokenAmount / (10 ** quote.toToken.decimals);
    }
    if (source === document.getElementById("to_amount")) {
        amount = Number(
            document.getElementById("to_amount").value * 10 ** currentTrade.to.decimals
        );
        const quote = await Moralis.Plugins.oneInch.quote({
            chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
            fromTokenAddress: currentTrade.to.address, // The token you want to swap
            toTokenAddress: currentTrade.from.address, // The token you want to receive
            amount: amount,
        });
        console.log(quote);
        document.getElementById("gas_estimate").innerHTML = quote.estimatedGas;
        document.getElementById("from_amount").value = quote.toTokenAmount / (10 ** quote.toToken.decimals);
    }

}

async function trySwap() {
    let address = Moralis.User.current().get("ethAddress");
    let amount = Number(
        document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals
    )
    if (currentTrade.from.symbol !== "ETH") {

        const allowance = await Moralis.Plugins.oneInch.hasAllowance({
            chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
            fromTokenAddress: currentTrade.from.address, // The token you want to swap
            fromAddress: address, // Your wallet address
            amount: amount,
        })
        if (!allowance) {
            await Moralis.Plugins.oneInch.approve({
                chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
                tokenAddress: currentTrade.from.address, // The token you want to swap
                fromAddress: address, // Your wallet address
            });
        }

    }
    let receipt = await doSwap(address, amount);
    alert("Swap complete");
}

function doSwap(userAddress, amount) {
    return Moralis.Plugins.oneInch.swap({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress: currentTrade.from.address, // The token you want to swap
        toTokenAddress: currentTrade.to.address, // The token you want to receive
        amount: amount,
        fromAddress: userAddress, // Your wallet address
        slippage: 1,
    });
}

function changeFromTo() {
    console.log(currentTrade)
    document.getElementById("to_token_img").src = currentTrade.from.logoURI;
    document.getElementById("to_token_text").innerHTML = currentTrade.from.symbol;
    document.getElementById("from_token_img").src = currentTrade.to.logoURI;
    document.getElementById("from_token_text").innerHTML = currentTrade.to.symbol;

    let temp = currentTrade.from
    currentTrade.from = currentTrade.to.address;
    currentTrade.to = temp.address;
    console.log(currentTrade)
}


init();
document.getElementById("from_token_select").onclick = (() => { openModal("from") });
document.getElementById("to_token_select").onclick = (() => { openModal("to") });
document.getElementById("modal_close").onclick = closeModal;
document.getElementById("login_button").onclick = login;
document.getElementById("from_amount").addEventListener('input', getQuote);
document.getElementById("to_amount").addEventListener('input', getQuote);
document.getElementById("swap_button").onclick = trySwap;
document.getElementById("search-box").addEventListener('input', filterList);
document.getElementById("chg-from-to-btn").onclick = changeFromTo;