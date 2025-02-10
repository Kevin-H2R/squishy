"use client"
import { useEffect, useState } from "react";

export default function Home() {

  const [uploadedImages, setUploadedImages] = useState<{ id: number; filename: string; path: string }[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  async function fetchImages() {
    const res = await fetch("/api/image");
    const data = await res.json()
    setUploadedImages(data.images);
  }

  useEffect(() => {
    fetchImages();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);
      await fetch("/api/image", {
        method: "POST",
        body: formData,
      });
      await fetchImages()
      setSelectedImageId(uploadedImages[uploadedImages.length -1].id)
    }
  };


  const handleCompress = async () => {
    if (!selectedImageId) return alert("Select an image first");

    setIsCompressing(true);

    const res = await fetch("/api/compress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: selectedImageId }),
    });

    setIsCompressing(false);

    if (res.ok) {
      const data = await res.json();
      const compressedImagePath = data.path;

      const link = document.createElement("a");
      link.href = compressedImagePath;
      link.download = compressedImagePath.split("/").pop() || "compressed.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Compression failed.");
    }
  };


  return (
      <main className="flex gap-8 h-screen p-10">
        <div className="w-3/4 flex flex-col items-center p-4 border rounded-lg">
          <input type="file" onChange={handleFileChange} className="mb-4" />
          {selectedImageId && <div className="overflow-y-scroll max-h-screen"><img src={uploadedImages.filter(i => i.id === selectedImageId)[0].path} /></div>}
          {selectedImageId && (
            <button
              onClick={handleCompress}
              className="bg-green-500 text-white px-4 py-2 mt-4 rounded"
              disabled={!selectedImageId || isCompressing}
            >
            {isCompressing ? "Compressing..." : "Compress Image"}
            </button>
          )}
        </div>

        <div className="w-1/4 flex flex-col items-center">
          <h2 className="text-lg font-bold mb-2">Uploaded Images</h2>
          <div className="border p-4 rounded-lg flex flex-col gap-4 justify-center overflow-y-scroll max-h-screen">
            {uploadedImages && uploadedImages.map((img) => (
              <img
                key={img.id}
                src={img.path}
                alt={img.filename}
                className={`w-32 h-32 object-cover cursor-pointer rounded ${
                  selectedImageId === img.id ? "border-4 border-blue-500" : "border"
                }`}
                onClick={() => setSelectedImageId(img.id)}
              />
            ))}
          </div>
        </div>
    </main>
  );
}
