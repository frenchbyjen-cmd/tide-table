import { readAll, writeAll } from "./_store.mjs";

const json = (statusCode, body) => ({
  statusCode,
  headers: {"Content-Type":"application/json","Cache-Control":"no-store"},
  body: JSON.stringify(body)
});

export async function handler(event){
  try{
    const method = event.httpMethod;
    let requests = await readAll("tide-table-requests");

    if(method==="GET") return json(200,{requests});

    if(method==="POST"){
      const payload = JSON.parse(event.body || "{}");
      if(!payload.id || !payload.table || !payload.kind) return json(400,{error:"Invalid request"});
      requests.push(payload);
      await writeAll("tide-table-requests",requests);
      return json(201,{ok:true,request:payload});
    }

    if(method==="PUT"){
      const {id,status} = JSON.parse(event.body || "{}");
      const i=requests.findIndex(r=>r.id===id);
      if(i<0) return json(404,{error:"Request not found"});
      requests[i]={...requests[i],status,updatedAt:new Date().toISOString()};
      await writeAll("tide-table-requests",requests);
      return json(200,{ok:true,request:requests[i]});
    }

    if(method==="DELETE"){
      await writeAll("tide-table-requests",[]);
      return json(200,{ok:true});
    }

    return json(405,{error:"Method not allowed"});
  }catch(error){
    console.error(error);
    return json(500,{error:error.message || "Server error"});
  }
}
