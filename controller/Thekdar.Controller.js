const {Thekedar,Project,Hiring}=require("../models/module.Thekadar")
const HouseProject=require("../models/module.HouseOnwer")
// hirerequrest
const HireRequest = require("../models/module.hireRequest")

const PROFILE_FIELDS=["city","experience_years"]
const ROLE_THEKADAR="Thekadar"
const UPDATE_FIELDS=["status","start_date","end_date"]
const REQUEST_STATUSES=["pending","accepted","rejected","cancelled"]
const FINANCE_KEYS = [
  "total_amount", "received", "pending", "labour_hired", "labour_earned", "paid_to_labour",
  "labour_due", "rental_total", "rental_paid", "rental_due", "profit_so_far",
];
const BUSINESS_ERRORS = ["Project ongoing nahi hai", "Mazdoor available nahi hai", "Active hiring nahi mili", "Ye project ab open nahi hai"];
const NOT_FOUND_ERRORS = ["Pending request nahi mili"];
const ROLE_ADMIN="admin"

const pick=(obj={},keys)=>keys.reduce((o,k)=>(obj[k]!== undefined?((o[k]=obj[k]),o):o),{});
const requireThekedar=async(req,res)=>{
if(req.user?.role!==ROLE_THEKADAR){
    res.status(403).json({message:`yeh srif ${ROLE_THEKADAR} ka liya allowed ha `})
    return false;
}
return true
}
const fail=(res,err)=>{
    console.log(err.message);
    if(err.code===11000){
        return res.status(409).json({message:"ya record phele sa he mujood hai(mazdoor is project pr phala sa he active hai) "})    
    }
    let status=500
    if(err.name==="ValidationError" || err.name === "CastError") status=400;
    else if (BUSINESS_ERRORS.includes(err.message)) status = 409;
  else if (NOT_FOUND_ERRORS.includes(err.message)) status = 404;
  return res.status(status).json({ message: err.message });
}
const getMyThekedar=async(req,res)=>{
const me=await Thekedar.findOne({user:req.user.id});
if(!me)res.status(404).json({message:"phele se he thekdar profile mujood hai"})
    return me;
};

const findMyProject=(id,me)=>Project.findOne({_id:id,thekedar:me._id});


exports.createProfile=async(req,res)=>{
    try{
        if (!requireThekedar(req,res)) return;
        if(await Thekedar.exists({user:req.user.id})){
            return res.status(409).json({message:"profile phele sa mujood hai"})
        }
        const profile=await Thekedar.create({...pick(req.body||{},PROFILE_FIELDS),user:req.user.id})
        return res.status(201).json({message:"profile ban gya",profile})

    }catch(err){
        res.status(500).json({message:err.message})
        console.log(err.message);
        return fail(res,err);
    
    }
}

exports.getMyProfile=async(req,res)=>{
    try{
    if(!requireThekedar(req,res)) return;
    const me=await getMyThekedar(req,res);
    if(!me)return;
    return res.json(me)
    }catch(err){
        return fail(res,err);
    }
}

exports.updateProfile=async(req,res)=>{
    try{
        if(!requireThekedar(req,res)) return;
        const me=await getMyThekedar(req,res);
        if(!me)return
        me.set(pick(req.body||{},PROFILE_FIELDS))
        await me.save()
        return res.json({message:"profile update hogayi",profile:me})
    }catch(err){
        return fail(res,err)
    }
};

// ============================================================
// PROJECTS CONTROLLER (Thekedar ke apne projects)
// Har function ka pattern:
//   role check -> thekedar profile -> apna project -> kaam -> catch
// ============================================================

// ------------------------------------------------------------
// 1. LIST: mere projects ki list (pagination + status filter)
// ------------------------------------------------------------
exports.listProjects = async (req, res) => {
  try {
    // Sirf thekedar role allowed. Nahi hai to helper khud response bhejta hai, isliye return.
    if (!requireThekedar(req, res)) return;

    // Logged-in user ka Thekedar profile. Nahi mila to helper response bhej chuka, return.
    const me = await getMyThekedar(req, res);
    if (!me) return;

    // page: query se lo, ghalat/khali ho to 1, aur 1 se kam kabhi nahi.
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    // limit: default 12, kam az kam 1, zyada se zyada 50 (koi bohot bara na maange).
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

    // Filter: sirf MERE projects, aur soft-deleted nahi.
    // $ne:true = "jo deleted nahi", un mein woh bhi aate hain jinke paas field hi nahi.
    const filter = { thekedar: me._id, isDeleted: { $ne: true } };

    // Status diya ho (active/completed...) to us ke hisaab se filter.
    if (req.query.status) filter.status = req.query.status;

    // Dono queries ek saath (tez). Ab find aur count ka filter SAME hai.
    const [items, total] = await Promise.all([
      Project.find(filter)
        .sort({ createdAt: -1 })        // naye pehle
        .skip((page - 1) * limit)       // pichle pages chhod do
        .limit(limit),                  // sirf is page ke items
      Project.countDocuments(filter),   // total (pages nikalne ke liye)
    ]);

    return res.json({
      items,
      total,
      page,                              // maujooda page
      pages: Math.ceil(total / limit),   // total pages (pehle "page" overwrite ho raha tha)
    });
  } catch (err) {
    return fail(res, err);
  }
};

// ------------------------------------------------------------
// 2. GET: ek project + uska finance
// ------------------------------------------------------------
exports.getProject = async (req, res) => {
  try {
    if (!requireThekedar(req, res)) return;
    const me = await getMyThekedar(req, res);
    if (!me) return;

    // URL ki id se dhoondo AUR check ke yeh isi thekedar ka hai.
    const project = await findMyProject(req.params.id, me);

    // return zaroori: warna code aage chal kar null par getfinance() se crash hota.
    if (!project) return res.status(404).json({ message: "Project nahi mila" });

    // getfinance() model ka method hai jo paisay ka hisaab nikalta hai.
    return res.json({ project, finance: await project.getfinance() });
  } catch (err) {
    return fail(res, err);
  }
};

// ------------------------------------------------------------
// 3. UPDATE: project ki allowed fields badalna
// ------------------------------------------------------------
exports.updateProject = async (req, res) => {
  try {
    if (!requireThekedar(req, res)) return;
    const me = await getMyThekedar(req, res);
    if (!me) return;

    // req.params.id (pehle req,params.id tha: comma ki wajah se ReferenceError).
    const project = await findMyProject(req.params.id, me);
    if (!project) return res.status(404).json({ message: "Project nahi mila" });

    // pick = sirf PROFILE_FIELDS lo. Warna koi thekedar/isDeleted jaisi field bhej kar badal dega.
    // || {} taake body na ho to crash na ho.
    project.set(pick(req.body || {}, PROFILE_FIELDS));
    await project.save(); // validation ke saath DB mein save

    // Agar yeh kisi HouseProject se juda hai to uska status bhi sync kar do.
    if (project.house_project) {
      await HouseProject.updateOne(
        { _id: project.house_project },
        { status: project.status }
      );
    }

    return res.json({ message: "Project update ho gaya", project });
  } catch (err) {
    return fail(res, err);
  }
};

// ------------------------------------------------------------
// 4. DELETE: soft delete (data DB mein rehta hai)
// ------------------------------------------------------------
exports.deleteProject = async (req, res) => {
  try {
    if (!requireThekedar(req, res)) return;
    const me = await getMyThekedar(req, res);
    if (!me) return;

    const project = await findMyProject(req.params.id, me);
    if (!project) return res.status(404).json({ message: "Project nahi mila" });

    // Active mazdoor bandhe hon to delete nahi. 409 = Conflict.
    if (await Hiring.exists({ project: project._id, status: "active" })) {
      return res
        .status(409)
        .json({ message: "Pehle active mazdooron ko release karein" });
    }

    // Soft delete: asal mein mitate nahi, sirf nishani lagate hain.
    project.isDeleted = true;
    project.deletedAt = new Date();
    await project.save();

    return res.json({ message: "Project delete ho gaya" });
  } catch (err) {
    return fail(res, err);
  }
};

exports.listRequests = async (req, res) => {
  try {
    if (!requireThekedar(req, res)) return;

    const me = await getMyThekedar(req, res);
    if (!me) return;

    const status = req.query?.status || "pending";
    if (!REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `status ${REQUEST_STATUSES.join("/")} mein se ho`,
      });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

    const filter = { thekedar: me._id, status };
    const ownerFields = status === "accepted" ? "name phone" : "name";

const [items, total] = await Promise.all([
  HireRequest.find(filter)
    .populate("house_project", "title description location attachments")
    .populate("house_owner", ownerFields)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit),
  HireRequest.countDocuments(filter),
]);

    return res.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    return fail(res, err);
  }
};

exports.acceptRequest=async(req,res)=>{
  try{
    if (!(await requireThekedar(req, res))) return;
    const me=await getMyThekedar(req,res);
    if(!me)return;
  const project=await HireRequest.accept(req.params.id,me._id);
  return res.status(201).json({message:"Request accept ho gayi ,proejct ban gay"}) 
  } catch (err) {
    return fail(res, err);
  }
}

exports.rejectRequest=async(req,res)=>{
  try{
if(!requireThekedar(req,res))return;
const me=await getMyThekedar(req,res)
if(!me)return;
const request=await HireRequest.findOneAndUpdate(
  {_id:req.params.id,thekedar:me._id,status:"pending"},
  {status:"rejected",responded_At:new Date()},
  {new:true}
);
if (!request) return res.status(404).json({ message: "Pending request nahi mili" });
    return res.json({ message: "Request reject kar li", request });
  }catch(err){
    return fail(res, err);
  }
}

exports.getProjectFinance = async (req, res) => {
  try {
    if (!requireThekedar(req, res)) return;
    const me = await getMyThekedar(req, res);
    if (!me) return;
    const project = await findMyProject(req.params.id, me);
    if (!project) return res.status(404).json({ message: "Project nahi mila" });
    return res.json(await project.getFinance());
  } catch (err) {
    return fail(res, err);
  }
};

exports.getFinanceSummary=async(req,res)=>{
  try{
    if(!requireThekedar(req,res))return
    const me=await getMyThekedar(req,res);
    if(!me)return;
    const project=await Project.find({thekedar:me._id})
    const finance=await Promise.all(project.map((p)=>p.getFinance()));
    const totals = Object.fromEntries(
      FINANCE_KEYS.map((k) => [k, finance.reduce((t, f) => t + (f[k] || 0), 0)])
    );
    return res.json({ project: project.length, ...totals });
  } catch (err) {
    return fail(res, err);
  }
};

exports.hireLabour = async (req, res) => {
  try {
    if (!requireThekedar(req, res)) return;
    const me = await getMyThekedar(req, res);
    if (!me) return;

    const project = await findMyProject(req.params.id, me);
    if (!project) {
      return res.status(404).json({ message: "project nhi ha" });
    }

    const { labour, daily_wage } = req.body || {};

    const hiring = await Hiring.hire({
      project: project._id,
      labour,
      daily_wage,
    });

    return res.status(201).json({ message: "Labour hired successfully", hiring });
  } catch (err) {
    return fail(res, err);
  }
};

exports.listHirings=async(req,res)=>{
try{
  if(!requireThekedar(req,res))return;
  const me=await getMyThekedar(req,res);
  if(!me)return;
  const project=await findMyProject(req.params.id,me);
  if(!project)return res.status(404).json({message:"project nhi hai/milla"})
    const hirings=await Hiring.find({project:project._id,thekedar:me._id})
    .populate("labour")
    .sort({createdAt:-1})
    return res.json(hirings)
 }catch(err){
  return fail(res,err)
 }
  }

  exports.releaseHiring = async (req, res) => {
  try {
    if (!requireThekedar(req, res)) return;
    const me = await getMyThekedar(req, res);
    if (!me) return;

    const status = req.body?.status || "completed";
    if (!["completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "status completed ya cancelled hona chahiye" });
    }

    const hiring = await Hiring.findOne({ _id: req.params.id, thekedar: me._id, status: "active" });
    if (!hiring) return res.status(404).json({ message: "Active hiring nahi mili" });

    const done = await Hiring.release(hiring._id, status); // hiring band + mazdoor dobara available
    return res.json({ message: "Mazdoor chhor diya", hiring: done });
  } catch (err) {
    return fail(res, err);
  }
};
