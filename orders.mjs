import { readAll, writeAll } from "./_store.mjs";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(body)
});

export async function handler(event){
  try{
    const method = event.httpMethod;
    let orders = await readAll("tide-table-orders");

    if(method === "GET") return json(200,{orders});

    if(method === "POST"){
      const payload = JSON.parse(event.body || "{}");
      if(!payload.id || !payload.table || !Array.isArray(payload.items)) return json(400,{error:"Invalid order"});
      orders.push(payload);
      await writeAll("tide-table-orders",orders);
      return json(201,{ok:true,order:payload});
    }

    if(method === "PUT"){
      const {id,status} = JSON.parse(event.body || "{}");
      const index = orders.findIndex(o=>o.id===id);
      if(index<0) return json(404,{error:"Order not found"});
      orders[index] = {...orders[index],status,updatedAt:new Date().toISOString()};
      await writeAll("tide-table-orders",orders);
      return json(200,{ok:true,order:orders[index]});
    }

    if(method === "DELETE"){
      await writeAll("tide-table-orders",[]);
      return json(200,{ok:true});
    }

    return json(405,{error:"Method not allowed"});
  }catch(error){
    console.error(error);
    return json(500,{error:error.message || "Server error"});
  }
}
