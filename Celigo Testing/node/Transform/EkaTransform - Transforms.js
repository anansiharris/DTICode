function jsonAPIRequestParseResponse(response) {
  if(response.record.data.length===0){
    let blank="none"
    
    return response.record
  }
 const forIn = (obj, cb) => {
   const keys = Object.keys(obj);
   keys.forEach((key) => {
     cb(obj[key], key);
   });
 };


 const normalizeRelationshipName = (name) => {
   return name.charAt(0).toLowerCase() + name.slice(1);
 };


 const findRelationshipById = (included, data) => {
   return included.find((incl) => (
     incl.type === data.type && incl.id === data.id
   ));
 };


 const jsonAPIRequestParseResource = (resource, included) => {
   const normalizeResource = (resource2, included2) => {
     const relationships = (
       included2 &&
       typeof resource2.relationships === 'object' &&
       Object.keys(resource2.relationships).length > 0
     ) ?
       resource2.relationships :
       false;
     const normalizedResource = (relationships) ?
     jsonAPIRequestParseResource(resource2, included2) :
     {
       ...resource2.attributes,
       id: resource2.id,
     };
     return normalizedResource;
   };


   const parsedResource = normalizeResource(resource);
   const relationships = resource.relationships;
   if (relationships) {
     forIn(relationships, (relationship, relationshipName) => {
       let relation;
       const data = relationship.data;
       if (data) {
         relation = (Array.isArray(data)) ?
           data.map((value) => normalizeResource(
             findRelationshipById(included, value),
             included
           )) :
           normalizeResource(findRelationshipById(included, data), included);
       } else {
         relation = [];
       }
       parsedResource[normalizeRelationshipName(relationshipName)] = relation;
     });
   }


   return parsedResource;
 };


 const included = response.record.included;
 if (Array.isArray(response.record.data)) {
   return response.record.data.map((resource) => (
     jsonAPIRequestParseResource(resource, included)
   ));
 }


 return jsonAPIRequestParseResource(response.record.data, included);
}

module.exports = { jsonAPIRequestParseResponse, transform: jsonAPIRequestParseResponse };
