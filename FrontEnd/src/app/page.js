import Image from "next/image";
import SelectTecnicos from "../Components/SelectTecnicos.jsx"

export default function Home() {
  return (
    <div
      className="
        min-h-screen
        flex
        items-start
        justify-center
        bg-gradient-to-br 
        from-blue-100 
        via-sky-100 
        to-indigo-100
        pt-20
        px-4
      "
    >
        <main
          className="
            w-full
            max-w-xl
          "
        >
            <SelectTecnicos />
      </main>
</div>
  );
}
