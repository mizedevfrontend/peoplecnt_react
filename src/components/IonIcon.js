import React from "react";
import * as IonIcons from "react-icons/io5";
import { IoDocumentTextOutline } from "react-icons/io5";

const IonIcon = ({ name, size = 24, color = "white" }) => {
  const IconComponent = IonIcons[name];

  if (!IconComponent) {
    console.error(`IonIcon: Icon "${name}" not found. Using default icon.`);
    return <IoDocumentTextOutline size={size} color={color} />;
  }

  return <IconComponent size={size} color={color} />;
};

export default IonIcon;
