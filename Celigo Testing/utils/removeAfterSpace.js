function removeAfterSpace(str) {
  const spaceIndex = str.indexOf(" ");
  if (spaceIndex !== -1) {
    return str.substring(0, spaceIndex);
  }
  return str; // Return original string if no space is found
}
