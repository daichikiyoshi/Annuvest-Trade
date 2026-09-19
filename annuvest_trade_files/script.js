const assetPrices={VAL:185.20,RBLX:245.10,MC:142.30,COD:498.20,ML:231.40};

let selectedAsset="VAL";
let currentPrice=assetPrices.VAL;
let cashBalance=10000;
let ownedShares=0;
let averageBuyPrice=0;
let selectedTimeFrame="1m";
let candleData=[];
let tradeRecords=[];

const chart=document.getElementById("priceChart");
const chartContext=chart.getContext("2d");

function formatCurrency(amount){
  return "$"+amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
}

function createStartingCandles(){
  candleData=[];
  let startingPrice=currentPrice;
  for(let count=0;count<60;count++){
    const openPrice=startingPrice+(Math.random()-0.5)*2;
    const closePrice=openPrice+(Math.random()-0.5)*3;
    const highPrice=Math.max(openPrice,closePrice)+Math.random()*1.5;
    const lowPrice=Math.min(openPrice,closePrice)-Math.random()*1.5;
    candleData.push({open:openPrice,close:closePrice,high:highPrice,low:lowPrice});
    startingPrice=closePrice;
  }
}

function selectAsset(assetCode,clickedButton){
  selectedAsset=assetCode;
  currentPrice=assetPrices[assetCode];
  document.getElementById("assetSymbol").textContent=assetCode;
  document.getElementById("assetSelect").value=assetCode;

  document.querySelectorAll(".asset-button").forEach(function(button){
    button.classList.remove("active");
  });

  if(clickedButton){
    clickedButton.classList.add("active");
  }

  ownedShares=0;
  averageBuyPrice=0;
  createStartingCandles();
  refreshDashboard();
  drawPriceChart();
}

function selectAssetFromMenu(assetCode){
  const selectedButton=[...document.querySelectorAll(".asset-button")]
    .find(function(button){return button.textContent.includes(assetCode);});
  selectAsset(assetCode,selectedButton);
}

function selectTimeFrame(timeFrame,clickedButton){
  selectedTimeFrame=timeFrame;
  document.querySelectorAll(".time-button").forEach(function(button){
    button.classList.remove("active");
  });
  clickedButton.classList.add("active");
  showNotification("Chart set to "+selectedTimeFrame);
}

function showNotification(message){
  const notificationBox=document.getElementById("notification");
  notificationBox.textContent=message;
  setTimeout(function(){notificationBox.textContent="";},1800);
}

function placeOrder(orderSide){
  const quantity=Math.max(1,parseInt(document.getElementById("quantityInput").value)||1);
  const orderValue=quantity*currentPrice;

  if(orderSide==="BUY"){
    if(orderValue>cashBalance){
      showNotification("Not enough virtual balance.");
      return;
    }
    const oldPositionValue=averageBuyPrice*ownedShares;
    averageBuyPrice=(oldPositionValue+orderValue)/(ownedShares+quantity);
    ownedShares+=quantity;
    cashBalance-=orderValue;
  }else{
    if(quantity>ownedShares){
      showNotification("You do not have enough shares.");
      return;
    }
    ownedShares-=quantity;
    cashBalance+=orderValue;
    if(ownedShares===0)averageBuyPrice=0;
  }

  const profitLoss=(currentPrice-averageBuyPrice)*quantity;
  tradeRecords.unshift({
    time:new Date().toLocaleTimeString(),
    asset:selectedAsset,
    side:orderSide,
    quantity:quantity,
    price:currentPrice,
    profitLoss:profitLoss
  });

  updateTradeTable();
  refreshDashboard();
  showNotification(orderSide+" order completed in practice mode.");
}

function refreshDashboard(){
  document.getElementById("currentPrice").textContent=formatCurrency(currentPrice);
  document.getElementById("cashBalance").textContent=formatCurrency(cashBalance);
  document.getElementById("shareCount").textContent=ownedShares;
  document.getElementById("averagePrice").textContent=formatCurrency(averageBuyPrice);
  document.getElementById("marketValue").textContent=formatCurrency(ownedShares*currentPrice);

  const unrealizedProfitLoss=(currentPrice-averageBuyPrice)*ownedShares;
  const profitLossElement=document.getElementById("unrealizedProfitLoss");
  profitLossElement.textContent=formatCurrency(unrealizedProfitLoss);
  profitLossElement.className=unrealizedProfitLoss>=0?"positive":"negative";

  if(candleData.length){
    const highestValue=Math.max(...candleData.map(function(candle){return candle.high;}),currentPrice);
    const lowestValue=Math.min(...candleData.map(function(candle){return candle.low;}),currentPrice);
    document.getElementById("openPrice").textContent=formatCurrency(candleData[0].open);
    document.getElementById("highPrice").textContent=formatCurrency(highestValue);
    document.getElementById("lowPrice").textContent=formatCurrency(lowestValue);
  }

  document.getElementById("tradingVolume").textContent=
    Math.floor(120000+Math.random()*900000).toLocaleString();
}

function updateTradeTable(){
  const tableBody=document.getElementById("tradeHistory");

  if(!tradeRecords.length){
    tableBody.innerHTML='<tr><td colspan="6">No trades yet</td></tr>';
    return;
  }

  tableBody.innerHTML=tradeRecords.map(function(record){
    const sideClass=record.side==="BUY"?"positive":"negative";
    return `<tr>
      <td>${record.time}</td><td>${record.asset}</td>
      <td class="${sideClass}">${record.side}</td>
      <td>${record.quantity}</td><td>${formatCurrency(record.price)}</td>
      <td>${formatCurrency(record.profitLoss)}</td>
    </tr>`;
  }).join("");
}

function clearTradeHistory(){
  tradeRecords=[];
  updateTradeTable();
  showNotification("Trade history cleared.");
}

function drawPriceChart(){
  const displayWidth=chart.clientWidth;
  const displayHeight=chart.clientHeight;
  const pixelRatio=window.devicePixelRatio||1;

  chart.width=displayWidth*pixelRatio;
  chart.height=displayHeight*pixelRatio;
  chartContext.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  chartContext.clearRect(0,0,displayWidth,displayHeight);

  if(candleData.length<2)return;

  const padding={left:12,right:65,top:15,bottom:25};
  const chartWidth=displayWidth-padding.left-padding.right;
  const chartHeight=displayHeight-padding.top-padding.bottom;

  const highestPrice=Math.max(...candleData.map(function(candle){return candle.high;}));
  const lowestPrice=Math.min(...candleData.map(function(candle){return candle.low;}));

  function getYPosition(value){
    return padding.top+((highestPrice-value)/(highestPrice-lowestPrice||1))*chartHeight;
  }

  function getXPosition(index){
    return padding.left+index*(chartWidth/(candleData.length-1));
  }

  chartContext.strokeStyle="#27313c";
  chartContext.lineWidth=1;

  for(let row=0;row<6;row++){
    const yPosition=padding.top+row*chartHeight/5;
    chartContext.beginPath();
    chartContext.moveTo(padding.left,yPosition);
    chartContext.lineTo(displayWidth-padding.right,yPosition);
    chartContext.stroke();

    const labelPrice=highestPrice-(highestPrice-lowestPrice)*row/5;
    chartContext.fillStyle="#657180";
    chartContext.font="11px Arial";
    chartContext.fillText(formatCurrency(labelPrice),displayWidth-padding.right+8,yPosition+4);
  }

  candleData.forEach(function(candle,index){
    const xPosition=getXPosition(index);
    const openY=getYPosition(candle.open);
    const closeY=getYPosition(candle.close);
    const highY=getYPosition(candle.high);
    const lowY=getYPosition(candle.low);

    chartContext.beginPath();
    chartContext.moveTo(xPosition,highY);
    chartContext.lineTo(xPosition,lowY);
    chartContext.stroke();

    const bodyTop=Math.min(openY,closeY);
    const bodyHeight=Math.max(2,Math.abs(closeY-openY));
    chartContext.fillStyle=candle.close>=candle.open?"#39d98a":"#ff6374";
    chartContext.fillRect(xPosition-2.5,bodyTop,5,bodyHeight);
  });
}

function updateMarketPrice(){
  const previousPrice=currentPrice;
  const priceMovement=(Math.random()-0.48)*0.9;
  currentPrice=Math.max(0.01,currentPrice+priceMovement);

  const changePercent=((currentPrice-previousPrice)/previousPrice)*100;
  const changeElement=document.getElementById("priceChange");
  changeElement.textContent=(changePercent>=0?"+":"")+changePercent.toFixed(2)+"%";
  changeElement.className=changePercent>=0?"positive":"negative";

  candleData.push({
    open:previousPrice,
    close:currentPrice,
    high:Math.max(previousPrice,currentPrice)+Math.random()*0.4,
    low:Math.min(previousPrice,currentPrice)-Math.random()*0.4
  });

  if(candleData.length>60)candleData.shift();

  assetPrices[selectedAsset]=currentPrice;
  refreshDashboard();
  drawPriceChart();
}

createStartingCandles();
refreshDashboard();
drawPriceChart();

window.addEventListener("resize",drawPriceChart);
setInterval(updateMarketPrice,1200);
