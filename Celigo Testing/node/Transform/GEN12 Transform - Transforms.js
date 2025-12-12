function transform(options) {
  var record = options.record;
  
  var items = record.items.split(", ").filter(date => date.trim() !== "");
  delete record.items
  var lots = record.lots
  .split(', ')
  //console.log(JSON.stringify(lots))
  delete record.lots
  var qty = record.Qty.split(",").filter(date => date.trim() !== "");
  delete record.items
  
  var lines = [];
  record.TotalQty=0
  record.TotalWgt=0
  record.items=[items[0].replace('^','')]
  record.lots=lots
  record.qty=qty
  var lt=record.lots[0]
  var weight
  var test
  var batch
  var itemPlaceholder
  for (let i = 0; i < items.length; i++) {
    record.TotalQty=i
    batch =lots[i]
    
    
    if(items[i].includes(" ")){
      itemPlaceholder=items[i].split(" ")
      items[i]=itemPlaceholder[0]
      console.log(items[i])
    }
    
    
    lines.push({
        item: items[i],
        qty: qty[i],
        lot:lots[i]
      })
    
    if(i>0){
      record.items.push(items[i].replace('^',''))
      lt=lots[i]
      record.lots.push(lots[i])
    }
    
  }
  record.TotalQty=String(Number(qty[qty.length-1]))
  record.lines = lines;
  console.log(qty[qty.length-1])
 
  return options;
}

   function removeAfterSpace(str) {
     const spaceIndex = str.indexOf(' ');
     if (spaceIndex !== -1) {
       return str.substring(0, spaceIndex);
     }
     return str; // Return original string if no space is found
   }

module.exports = { transform };
