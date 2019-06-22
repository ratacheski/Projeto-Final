package br.ufg.emc.pdfReader;

import com.itextpdf.text.DocumentException;
import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;

//*******************************************************************************//
//*									pdfReader UFG								*//
//*			Gerador de Base de Dados a partir de Faturas da CELG em PDF			*//
//*																				*//
//* @author Rafael Ratacheski de Sousa Raulino 									*//
//* @institution Universidade Federal de Goiás - UFG							*//
//*	@year 2017																	*//
//*******************************************************************************//
public class App {

	public static final String DEST = "./output/parsed.txt";
	public static final String FINALDEST = "./output/teste.csv";

	public static void app(File path, File dest) 
			throws IOException, DocumentException {
		File file = new File(DEST);
		file.getParentFile().mkdirs();
		Collection<File> sources = listaDiretorios(path);
		Object[] paths = sources.toArray();
		int control = 0;
		String source;
		while (control < sources.size()) {
			source = paths[control].toString();
			/********************************************************/
			// Debug de Paginas Do PDF //
			// 1 - Arquivo output/parsed.txt contém o parcial da //
			// conversão da última página lida pelo pdfReader //
			// //
			/********************************************************/

			if (source.endsWith(".pdf")) {
				new App().parse(source, 1);
				Parser.readPage1(source, dest);
				new App().parse(source, 2);
				Parser.readPage2(source, dest);
			}
			control++;
		}
		return;
	}

	public void parse(String filename, int pagenumber) throws IOException {
		PdfReader reader = new PdfReader(filename);
		FileOutputStream fos = new FileOutputStream(DEST);
		if (reader.getNumberOfPages() >= pagenumber) {
			fos.write(PdfTextExtractor.getTextFromPage(reader, pagenumber).getBytes("UTF-8"));
			fos.flush();
			fos.close();
		}
	}

	private static Collection<File> listaDiretorios(File path) {
		Collection<File> listaVolta = new ArrayList<File>();
		File[] files = path.listFiles();
		for (int i = 0; i < files.length; i++) {
			File arq = files[i];
			if (arq.isDirectory()) {

				Collection<File> lista = listaDiretorios(arq);
				if (lista.size() > 0)
					listaVolta.addAll(lista);
			}

			else {
				listaVolta.add(arq);
			}
		}
		return listaVolta;
	}

}