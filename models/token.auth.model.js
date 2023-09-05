import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    _id: {
      type: String,
      require: true,
    },
    uid: {
      type: String,
      require: true,
    },
    nodeRoot: {
      type: String,
    },
    timeCreated: {
      type: Date,
      default: () => new Date(+new Date() + 10 * 60 * 1000),
    },
    isActive: {
      type: Boolean,
      require: true,
      default: true,
    },
  },
  { timestamps: true }
);
schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});
export default mongoose.model("tokenAuths", schema);
