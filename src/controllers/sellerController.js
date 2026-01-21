const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');


const createSeller = async (req, res) => {
    try {
        const { name, category, contact_num, email, platform_name, staff_id } = req.body;

        if(!req.file) {
            return res.status(400).json({success:false,data:"No image file uploaded for seller."});
        }

        if(!name || !category || !contact_num || !email || !platform_name || !staff_id) {
            return res.status(400).json({success:false,data:{
                message: `All fields are required.`,
                var: [name, category, contact_num, email, platform_name, staff_id]
            }});
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        const query = `
            INSERT INTO seller (name, category, contact_num, email, image_path, platform_name, staff_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [name, category, contact_num, email, imageUrl, platform_name, staff_id];

        const result = await run(query, params);
        await logAudit(req.user.id, 'CREATE', 'seller', result.lastID, `Created seller profile ${name}`, req.ip);

        res.status(200).json({
            success:true,
            data:"Inventory item successfully created.",
            id:result.lastID
        });
    } catch(err) {
        res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`});
    }

}


module.exports = {
    createSeller
}