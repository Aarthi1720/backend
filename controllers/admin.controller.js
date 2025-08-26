// controllers/admin.controller.js
import User from "../models/User.js";

// ✅ GET /admin/id-verifications?status=pending&page=1&limit=6
export const getPendingIdVerifications = async (req, res) => {
  try {
    const { page = 1, limit = 6, status = "pending", search = "" } = req.query;
    const query = {
      role: { $ne: "admin" }, // ❌ Exclude admins
    };

    if (status !== "all") {
      query["idVerification.status"] = status;
    }

    // If we're asking for "pending", only show users who actually have a document
   if (status === "pending") {
     query["idVerification.documentUrl"] = { $exists: true, $ne: "" };
   }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select("name email updatedAt idVerification")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),

      User.countDocuments(query),
    ]);

    res.json({ users, total });
  } catch (err) {
    console.error("Failed to fetch ID verifications:", err);
    res.status(500).json({ message: "Failed to fetch verifications" });
  }
};

// ✅ POST /admin/id-verifications/:userId/:status
export const updateIdVerificationStatus = async (req, res) => {
  const { userId, status } = req.params;
  // Frontend sends "approve" | "reject"; map to model values
  const mapped =
    status === "approve" ? "verified" :
    status === "reject"  ? "rejected" : status;

  if (!["verified", "rejected"].includes(mapped)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const user = await User.findById(userId);
    if (!user || !user.idVerification?.documentUrl) {
      return res.status(404).json({ message: "User or ID not found" });
    }

     user.idVerification.status = mapped;
    await user.save();

    res.json({ message: `Marked as ${mapped}`, user });
  } catch (err) {
    console.error("Verification update failed:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ PATCH /admin/kyc/:userId
export const updateKycStatus = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!["pending", "verified", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const user = await User.findById(userId);
  if (!user?.idVerification?.documentUrl) {
    return res.status(404).json({ message: "User or document not found" });
  }

  user.idVerification.status = status;
  await user.save();

  res.json({ message: `User KYC status updated to ${status}`, user });
};
